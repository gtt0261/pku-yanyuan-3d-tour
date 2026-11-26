/* Run with Playwright available to Node. No server is required for the default file URL. */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');

(async () => {
  const url = process.env.TOUR_URL || pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href;
  const browser = await chromium.launch({
    executablePath: process.env.TOUR_BROWSER || undefined,
    args: process.env.TOUR_SOFTWARE_GL ? ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] : [],
    headless:true
  });
  try {
    const mobile = process.argv.includes('--mobile'), preview = process.argv.includes('--preview');
    const page = await browser.newPage(mobile ? {viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1} : {viewport:{width:1320,height:820},deviceScaleFactor:1});
    page.setDefaultTimeout(45000);
    const errors=[];
    page.on('pageerror',e=>{errors.push(e.message);console.log('Page error:',e.message);});
    page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log('Console error:',m.text().slice(0,800));}});
    await page.goto(url,{waitUntil:'load'});
    await page.waitForFunction(()=>typeof window.campusStatus==='function');
    await page.waitForFunction(()=>document.getElementById('fps').textContent!=='—');
    await page.waitForTimeout(1800);
    const state=()=>page.evaluate(()=>window.campusStatus());
    const screenshot=async name=>{
      if(!process.env.TOUR_SCREENSHOTS)return;
      fs.mkdirSync(process.env.TOUR_SCREENSHOTS,{recursive:true});
      await page.screenshot({path:path.join(process.env.TOUR_SCREENSHOTS,name+'.png'),timeout:60000});
    };
    const initial=await state();
    assert.equal(initial.mode,'free');assert.ok(initial.buildings>=240);assert.ok(initial.venues>100);assert.equal(initial.towerEmission,0);
    assert.ok(Math.abs(initial.mirror[1]+initial.camera[1]-2*initial.waterY)<.02);
    assert.ok(Math.abs(initial.mirror[0]-initial.camera[0])<.02);
    console.log('Opened',JSON.stringify(initial),'measured FPS',await page.locator('#fps').textContent());
    await screenshot(mobile?'mobile-day':'desktop-day');
    if(preview)return;
    await page.locator('#night').click();await page.waitForFunction(()=>campusStatus().night&&campusStatus().towerEmission>0);
    await screenshot(mobile?'mobile-night':'desktop-night');
    await page.locator('#day').click();assert.equal((await state()).towerEmission,0);
    for(const id of ['tower','library']){
      await page.locator('.postcard[data-id="'+id+'"]').click();
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      if(!mobile)await screenshot('desktop-'+id);
    }
    await page.locator('.postcard[data-id="gate"]').click();assert.equal(await page.locator('#current-name').textContent(),'西校门');
    if(!mobile)await screenshot('desktop-gate');
    await page.locator('#bike').click();assert.equal((await state()).bike,true);assert.equal((await state()).parkedBikes,initial.parkedBikes-1);
    await page.locator('#quality').selectOption('low');assert.equal((await state()).quality,'low');
    if(!mobile){
      await page.locator('#world').focus();const p=(await state()).position;
      await page.keyboard.down('KeyW');await page.waitForTimeout(750);await page.keyboard.up('KeyW');
      const q=(await state()).position;assert.ok(Math.hypot(q[0]-p[0],q[1]-p[1])>.12,'Riding must move the visitor');
      await page.keyboard.press('KeyE');assert.equal((await state()).bike,false);assert.equal((await state()).parkedBikes,initial.parkedBikes);
    } else {
      const bounds=await page.locator('#touch-pad').boundingBox(),p=(await state()).position;
      assert.ok(bounds && bounds.width>0);
      const cdp=await page.context().newCDPSession(page),x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-19}]});
      await page.waitForTimeout(650);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      const q=(await state()).position;assert.ok(Math.hypot(q[0]-p[0],q[1]-p[1])>.1,'Touch stick moves the rider');
    }
    await page.locator('#minimap-btn').click();await page.locator('#search').fill('农园');
    const hit=page.locator('#venue-list .venue:not(:disabled)').first();await hit.waitFor();await hit.click();assert.match(await page.locator('#current-name').textContent(),/农园/);
    await page.locator('#help-btn').click();assert.ok(await page.locator('#help').isVisible());await page.locator('#help .close-dialog').click();
    if(!mobile){
      const start=Date.now();await page.locator('#tour').click();assert.equal((await state()).mode,'tour');
      await page.waitForFunction(()=>campusStatus().mode==='free',null,{timeout:23000,polling:100});
      const elapsed=Date.now()-start;assert.ok(elapsed>=14950&&elapsed<22500,'Expected 15 seconds of visible travel');console.log('Tour round trip (ms, includes test input and polling)',elapsed);
      assert.equal(await page.locator('#current-name').textContent(),'未名湖');
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true);
    assert.deepEqual(errors,[]);console.log('Passed',mobile?'mobile':'desktop');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
