"""Rebuild the campus layers from a saved OSM /api/0.6/map XML response.

Run with Python 3 and Shapely 2: python tools/build_map.py path/to/map.osm
The distributed derivative database is licensed under ODbL 1.0.
"""

import argparse
import hashlib
import json
import math
import re
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

from shapely import make_valid
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import polygonize, unary_union


ORIGIN = (116.31150, 39.99100)
DEGREE = 6371008.8 * math.pi / 180
SOURCE = "https://api.openstreetmap.org/api/0.6/map?bbox=116.2945,39.9805,116.3210,40.0050"
BOUNDARY_WAY = "1330709889"
CHENGFU_WAY = "1122569397"
DIST = Path(__file__).resolve().parents[1] / "dist"
WIDTHS = {"service": 5, "residential": 7, "unclassified": 6, "living_street": 5,
          "pedestrian": 5, "cycleway": 3, "footway": 2.4, "path": 1.8, "steps": 2.5,
          "track": 3.5}


def project(lon, lat):
    return ((lon - ORIGIN[0]) * DEGREE * math.cos(math.radians(ORIGIN[1])),
            (ORIGIN[1] - lat) * DEGREE)


def tags(element):
    return {tag.get("k"): tag.get("v") for tag in element.findall("tag")}


def title(tag):
    return tag.get("name:zh-Hans") or tag.get("name:zh") or tag.get("name") or ""


def num(value):
    if value and re.fullmatch(r"\d+(\.\d+)?(?:\s*m)?", value):
        value = float(value.rstrip("m ").strip())
        return int(value) if value.is_integer() else value
    return None


def parts(shape, wanted):
    if shape.is_empty:
        return
    if shape.geom_type == wanted:
        yield shape
    elif hasattr(shape, "geoms"):
        for child in shape.geoms:
            yield from parts(child, wanted)


def points(coords):
    return [[round(x, 1), round(z, 1)] for x, z in coords]


def ring_fields(poly):
    result = {"ring": points(list(poly.exterior.coords)[:-1])}
    holes = [points(list(loop.coords)[:-1]) for loop in poly.interiors]
    if holes:
        result["holes"] = holes
    return result


def classify(tag):
    name = title(tag)
    use = tag.get("amenity")
    building = tag.get("building")
    if re.search("食堂|餐厅|餐饮|餐馆", name) or use in ("restaurant", "food_court"):
        return "dining"
    if re.search("办公楼|审计室|人事部|教育基金会|档案馆|亨利楼|伟利楼", name) or building == "office" or tag.get("office"):
        return "office"
    if re.search("体育馆|体育中心|运动场", name) or building in ("sports_hall", "grandstand", "stadium"):
        return "sport"
    if re.search("图书馆|博物馆|校史馆|纪念讲堂|博雅塔|岛厅|校景亭|西门|故居|慈济寺山门|临湖轩", name) or use == "library":
        return "culture"
    if re.search("教学|学院|科研|研究|实验|学系|物理|生物|化学|地学|外文楼|俄文楼|文史楼|理科|电化|人文学苑|微纳电子", name):
        return "academic"
    if building in ("dormitory", "apartments", "house", "residential") or re.search(r"学生宿舍|朗润园\d+号楼|勺园[1-6]号楼", name):
        return "residence"
    if building in ("university", "school", "college") or use in ("university", "college", "research_institute"):
        return "academic"
    if re.search("医院|中水站|派出所|北大科技园|交流中心|章桂堂|勺园[78]号楼", name) or building == "hotel" or use in ("hospital", "toilets", "police", "clinic"):
        return "service"
    return "other"


def parse_map(source_path, snapshot_date):
    root = ET.parse(source_path).getroot()
    node_elements = {n.get("id"): n for n in root.findall("node")}
    nodes = {i: project(float(n.get("lon")), float(n.get("lat"))) for i, n in node_elements.items()}
    ways = {w.get("id"): w for w in root.findall("way")}
    relations = {r.get("id"): r for r in root.findall("relation")}
    way_points = {i: [nodes[n.get("ref")] for n in w.findall("nd")] for i, w in ways.items()}
    # PKU identifies the adjoining Chengfu science park as campus land.
    campus = Polygon(way_points[BOUNDARY_WAY]).union(Polygon(way_points[CHENGFU_WAY]))
    assert campus.geom_type == "Polygon" and not campus.interiors and campus.is_valid
    assert 900_000 < campus.area < 1_600_000

    def relation_geometry(rel):
        roles = {"outer": [], "inner": []}
        for member in rel.findall("member"):
            role = member.get("role") or "outer"
            coords = way_points.get(member.get("ref"))
            if member.get("type") == "way" and role in roles and coords:
                roles[role].append(LineString(coords))
        outer = unary_union(list(polygonize(roles["outer"])))
        if roles["inner"]:
            outer = outer.difference(unary_union(list(polygonize(roles["inner"]))))
        return outer

    def area_use(t):
        if t.get("building") not in (None, "no"):
            return "buildings"
        if t.get("natural") == "water" or t.get("waterway") == "riverbank":
            return "water"
        if t.get("leisure") in ("garden", "park", "pitch", "track") or t.get("landuse") in ("grass", "forest", "meadow") or t.get("natural") in ("wood", "scrub", "grassland"):
            return "green"
        if t.get("man_made") == "pier" or t.get("highway") == "pedestrian" and t.get("area") == "yes":
            return "surfaces"
        return ""

    areas = {name: [] for name in ("buildings", "water", "green", "surfaces")}
    member_of = set()
    building_geometries = {}
    building_entries = {}
    orphan_parts = []
    candidates = []
    for i, rel in relations.items():
        t = tags(rel)
        layer = area_use(t)
        if t.get("type") != "multipolygon" or not layer:
            continue
        geom = relation_geometry(rel)
        if geom.is_empty or not geom.intersects(campus):
            continue
        candidates.append((layer, "r" + i, t, geom))
        for m in rel.findall("member"):
            if m.get("type") == "way" and m.get("role") in ("outer", "", None):
                member_of.add((layer, m.get("ref")))

    for i, w in ways.items():
        t = tags(w)
        layer = area_use(t)
        coords = way_points[i]
        if len(coords) < 4 or coords[0] != coords[-1]:
            continue
        if not layer and t.get("building:part") in (None, "no"):
            continue
        if (layer, i) in member_of:
            continue
        geom = make_valid(Polygon(coords))
        if not geom.intersects(campus):
            continue
        if layer:
            candidates.append((layer, "w" + i, t, geom))
        elif campus.covers(geom.representative_point()):
            orphan_parts.append(("w" + i, t, geom))

    def store_area(layer, oid, t, geom):
        if layer == "buildings":
            if not campus.covers(geom.representative_point()) and oid != "w226703926":
                return
        else:
            geom = geom.intersection(campus)
        for n, p in enumerate(parts(geom.simplify(0.15, preserve_topology=True), "Polygon")):
            if p.area < 0.75:
                continue
            ident = oid if n == 0 else oid + "." + str(n + 1)
            record = {"id": ident, "name": title(t), **ring_fields(p)}
            if layer == "buildings":
                record["kind"] = classify(t)
                for field, key in (("height", "height"), ("levels", "building:levels")):
                    number = num(t.get(key))
                    if number:
                        record[field] = number
                roof = t.get("roof:shape")
                if roof:
                    record["roof"] = roof
                for key, field in (("building:colour", "wallColor"), ("roof:colour", "roofColor")):
                    if key in t:
                        record[field] = t[key]
                building_geometries[ident] = p
                building_entries[ident] = record
            elif layer == "green":
                record["kind"] = t.get("leisure") or t.get("natural") or t.get("landuse")
            elif layer == "surfaces":
                record["kind"] = t.get("man_made") or "plaza"
            areas[layer].append(record)

    for entry in candidates:
        store_area(*entry)

    # Retain separately mapped structures without rendering roof/detail parts on top of their parent.
    covered = unary_union(list(building_geometries.values()))
    for oid, t, poly in orphan_parts:
        if not covered.covers(poly.representative_point()) and poly.intersection(covered).area < poly.area * 0.5:
            store_area("buildings", oid, t, poly)

    paths = []
    parking = []
    for i, w in ways.items():
        t = tags(w)
        coords = way_points[i]
        kind = t.get("highway")
        if t.get("amenity") == "bicycle_parking" and len(coords) >= 4 and coords[0] == coords[-1]:
            p = Polygon(coords).representative_point()
            if campus.covers(p):
                parking.append(points(p.coords)[0])
        if kind not in WIDTHS or len(coords) < 2 or t.get("area") == "yes" or t.get("indoor") == "yes":
            continue
        line = LineString(coords).intersection(campus)
        for n, segment in enumerate(parts(line, "LineString")):
            if segment.length < 1:
                continue
            record = {"id": "w" + i + (("." + str(n + 1)) if n else ""),
                      "name": title(t), "kind": kind, "width": num(t.get("width")) or WIDTHS[kind],
                      "points": points(segment.simplify(0.15).coords)}
            if t.get("bridge") not in (None, "no"):
                record["bridge"] = True
            paths.append(record)

    facilities = []
    for i, node in node_elements.items():
        t = tags(node)
        name = title(t)
        if not name and t.get("amenity") != "bicycle_parking":
            continue
        p = Point(nodes[i])
        if not campus.covers(p):
            continue
        if t.get("amenity") == "bicycle_parking":
            parking.append(points([nodes[i]])[0])
        if (not re.search("食堂|包子铺|研究中心|学院|学堂|派出所|保卫部|正大国际中心", name)
                or re.search("地铁|公交|派出所站", name)):
            continue
        kind = classify(t)
        if kind == "other" and "部" in name:
            kind = "office"
        record = {"id": "n" + i, "name": name, "kind": kind, "point": points(p.coords)[0]}
        owners = [(g.area, ident) for ident, g in building_geometries.items() if g.covers(p)]
        if owners:
            record["buildingId"] = min(owners)[1]
        facilities.append(record)

    def center(oid):
        t = "w" + oid
        poly = building_geometries[t] if t in building_geometries else Polygon(way_points[oid])
        return points(poly.centroid.coords)[0]

    lake = relation_geometry(relations["21716245"])
    anchors = {"tower": center("240825562"), "westGate": points([nodes["1422005424"]])[0],
               "library": points(building_geometries["r3249649"].centroid.coords)[0],
               "lake": points(lake.centroid.coords)[0], "island": center("272349096"),
               "pavilion": center("272349096"), "stoneBoat": center("272349094"),
               "fishIslet": center("1569631197"), "lakeView": [-662.6, -261.5],
               "northLakeView": [-713.6, -350.4], "linhuxuan": center("272353675")}
    assert not lake.covers(Point(anchors["lakeView"]))
    assert not lake.covers(Point(anchors["fishIslet"]))
    assert lake.covers(Point(anchors["lake"]))
    assert len(areas["buildings"]) >= 220 and len(paths) > 420
    for key, group in areas.items():
        assert len(group) == len({f["id"] for f in group}), key
        for item in group:
            p = Polygon(item["ring"], item.get("holes", []))
            assert p.area > 0 and p.is_valid, (key, item["id"])
    assert building_entries["w240832216"]["kind"] == "office"
    assert building_entries["w240825557"]["kind"] == "academic"
    assert building_entries["r21822650"]["kind"] == "dining"
    assert building_entries["r12815350"]["kind"] == "residence"
    assert "w1118943554" in building_entries
    assert next(f for f in facilities if f["id"] == "n8156964521")["buildingId"] == "r13059309"
    assert len(next(w for w in areas["water"] if w["id"] == "r21716245")["holes"]) == 1
    assert any(p["bridge"] for p in paths if "bridge" in p)

    meta = {"attribution": "© OpenStreetMap contributors", "license": "ODbL 1.0",
            "snapshot": snapshot_date, "source": SOURCE, "rawSHA256": hashlib.sha256(source_path.read_bytes()).hexdigest(),
            "boundaryOSM": "way/" + BOUNDARY_WAY, "boundaryVersion": int(ways[BOUNDARY_WAY].get("version")),
            "adjoiningOSM": "way/" + CHENGFU_WAY, "adjoiningVersion": int(ways[CHENGFU_WAY].get("version")),
            "originLonLat": list(ORIGIN), "axis": "metres: x east, z south", "earthRadius": 6371008.8}
    return {"meta": meta, "boundary": points(list(campus.exterior.coords)[:-1]), **areas,
            "paths": paths, "bikeParking": parking, "anchors": anchors, "facilities": facilities}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("osm", type=Path, help="OSM XML map response containing the full campus")
    parser.add_argument("--date", required=True, help="actual download date, YYYY-MM-DD")
    parser.add_argument("--out", type=Path, default=DIST / "campus-data.js")
    args = parser.parse_args()
    data = parse_map(args.osm, args.date)
    args.out.write_text("// © OpenStreetMap contributors · ODbL 1.0 · see map-sources.txt\n"
                        + "window.CAMPUS_DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":"))
                        + ";\n", encoding="utf-8")
    print({k: len(v) for k, v in data.items() if isinstance(v, list)})
    print(Counter(b["kind"] for b in data["buildings"]))
