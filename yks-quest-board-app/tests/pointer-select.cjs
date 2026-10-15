const assert=require('node:assert/strict');
module.exports=async(page,selector,value)=>{
  const native=page.locator(selector),control=native.locator('..');
  const label=await native.locator('option').evaluateAll((items,value)=>items.find(o=>o.value===value).label,value);
  await control.locator('.select-trigger').click();
  await control.getByRole('option',{name:label,exact:true}).click();
  assert.equal(await native.inputValue(),value);
};
