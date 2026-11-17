const assert=require('node:assert/strict');
module.exports=async(page,selector,value)=>{
  const native=page.locator(selector),control=native.locator('..');
  // Read the current option and its group in one browser task. Rendering can
  // replace option children between a locator query and evaluateAll's callback.
  const option=await native.evaluate((select,value)=>{const o=[...select.options].find(o=>o.value===value);if(!o)throw Error('Expected selectable option: '+value);return {label:o.label,week:o.parentElement.dataset.weekId};},value);
  await control.locator('.select-trigger').click();
  if(await native.getAttribute('data-week-groups')!==null){
    let scope=control;
    if(option.week){
      const headers=control.locator('.select-week-heading');await headers.nth(await headers.evaluateAll((es,id)=>es.findIndex(e=>e.dataset.weekId===id),option.week)).click();
      const groups=control.locator('[role="group"]');scope=groups.nth(await groups.evaluateAll((es,id)=>es.findIndex(e=>e.dataset.weekId===id),option.week));
    }
    await scope.getByRole('treeitem',{name:option.label,exact:true}).click();
  }else await control.getByRole('option',{name:option.label,exact:true}).click();
  assert.equal(await native.inputValue(),value);
};
