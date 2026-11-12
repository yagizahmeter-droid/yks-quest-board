(function(root){
 'use strict';
 const minimum=10,description='Yeni hesaplarda en az 10 karakter kullan. Uzun ve benzersiz bir parola tercih et.';
 const valid=value=>typeof value==='string'&&[...value].length>=minimum;
 const api={minimum,description,valid};
 if(typeof module!=='undefined')module.exports=api;else root.DersPasswordPolicy=api;
})(typeof window==='undefined'?globalThis:window);
