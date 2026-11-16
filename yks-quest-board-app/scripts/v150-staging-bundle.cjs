'use strict';
const fs=require('node:fs'),path=require('node:path'),migration=require('./v150-workspace-migration.cjs');
function bundle({enableCron=true}={}){
 let sql=`-- D.E.R.S. v1.5.0: STAGING ONLY hswipswqulolcwqvcjvi. NEVER production jswgagzbetwviamiwcck.
-- Atomic installation of M3–M7 on the previously verified M2 staging schema.
-- Existing rows and RLS are fingerprinted after every milestone. Backups stay server-only.
begin;
set local lock_timeout='5s';
do $staging$ begin
 if not exists(select 1 from ders_release_private.app_snapshots where version='1.5.0-M2' and data->>'_validated'='true')
 or to_regclass('public.teacher_workspace_drafts') is not null then raise exception 'Expected verified M2-only staging. Stop and inspect; no change applied.';end if;
end $staging$;
`;
 for(const step of ['M3','M4','M5','M6','M7']){
  if(step==='M6'&&enableCron)sql+=`
-- Native Supabase Cron; no external paid scheduler, API key or network request.
do $cron_available$ begin if not exists(select 1 from pg_available_extensions where name='pg_cron') then raise exception 'Native pg_cron unavailable; installation stopped.';end if;end $cron_available$;
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
`;
  let part=migration(step).replace(/^begin;\s*/,'').replace(/commit;\s*$/,'');
  sql+='\n-- '+step+'\n'+part+'\ndrop table pg_temp.v150_workspace_before,pg_temp.v150_workspace_tables;\n';
 }
 sql+='\ncommit;\n-- Completion check (no user data):\nselect version,data->>\'_validated\' as preserved from ders_release_private.app_snapshots where version in(\'1.5.0-M3\',\'1.5.0-M4\',\'1.5.0-M5\',\'1.5.0-M6\',\'1.5.0-M7\') order by version;\n';
 return sql;
}
module.exports=bundle;
if(require.main===module){const out=path.resolve(__dirname,'../docs/v150-staging-install.sql');fs.writeFileSync(out,bundle());console.log('Guarded staging SQL written to '+out);}
