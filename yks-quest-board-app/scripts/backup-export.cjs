const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const readline=require('node:readline').createInterface({input:process.stdin});
readline.once('line',line=>{
  try {
    const backup=JSON.parse(line);
    if(backup.projectRef!=='jswgagzbetwviamiwcck'||!Array.isArray(backup.boards))throw new Error('Unexpected backup project or format');
    const directory=path.resolve(__dirname,'../backups');fs.mkdirSync(directory,{recursive:true});
    const file=path.join(directory,'production-v11-'+Date.now()+'.json.dpapi');
    const script=`$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Security;
      $bytes=[Convert]::FromBase64String([Console]::In.ReadToEnd().Trim());
      $encrypted=[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);
      [IO.File]::WriteAllBytes('${file.replaceAll("'","''")}',$encrypted);
      $restored=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes('${file.replaceAll("'","''")}'),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);
      [BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($restored)).Replace('-','').ToLowerInvariant()`;
    const expected=crypto.createHash('sha256').update(line).digest('hex');
    const actual=cp.execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{input:Buffer.from(line).toString('base64'),encoding:'utf8',windowsHide:true}).trim();
    if(actual!==expected)throw new Error('Encrypted backup verification failed');
    console.log(JSON.stringify({file,sha256:expected,accounts:backup.accounts?.length,boards:backup.boards.length,verified:true}));
  }catch(error){console.error(error.message);process.exitCode=1;}
  finally{readline.close();}
});
