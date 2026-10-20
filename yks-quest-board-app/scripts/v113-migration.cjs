const fs=require('node:fs'),path=require('node:path');
const names=['20261020182434_learning_focus_interactions.sql','20261020194500_learning_request_identity.sql'];
module.exports=function guardedMigration(name){
 if(!names.includes(name))throw Error('Not a reviewed v1.1.3 migration');
 const sql=fs.readFileSync(path.join(__dirname,'../supabase/migrations',name),'utf8');
 if(!/^begin;\s/i.test(sql)||! /commit;\s*$/i.test(sql))throw Error('Expected atomic migration');
 return sql.replace(/^begin;\s/i,()=>`begin;
set local lock_timeout = '5s';
do $$ declare t record; begin
 for t in select key from jsonb_each(ders_release_private.v113_fingerprint()) where key not like '\\_%' order by key loop
  execute format('lock table %s in share mode',t.key);
 end loop;
end $$;
create temporary table v113_before on commit drop as select ders_release_private.v113_fingerprint() as fingerprint;
`).replace(/commit;\s*$/i,()=>`do $$ begin
 if (select fingerprint from v113_before) is distinct from ders_release_private.v113_fingerprint() then
  raise exception 'Existing records, account identities, policies or functions changed; release rolled back';
 end if;
end $$;
commit;`);
};
if(require.main===module)process.stdout.write(module.exports(process.argv[2]));
