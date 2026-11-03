@echo off
rem Mr. Mars Music Studio All in 1 - MRH DGN - masaustune ve Baslat menusune logolu kisayol olusturur.
rem Klasoru baska bir bilgisayara / USB'ye tasidiginizda orada bir kez calistirin.
setlocal
set "APP=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$w=New-Object -ComObject WScript.Shell; foreach($d in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))){ $s=$w.CreateShortcut((Join-Path $d 'Mr. Mars Music Studio.lnk')); $s.TargetPath=$env:APP+'Mr Mars Music Studio.cmd'; $s.WorkingDirectory=$env:APP; $s.IconLocation=$env:APP+'mrmars-gorseller\app.ico'; $s.WindowStyle=7; $s.Description='Mr. Mars Music Studio All in 1'; $s.Save() }"
if errorlevel 1 (
  echo Kisayol olusturulamadi.
) else (
  echo Masaustune ve Baslat menusune "Mr. Mars Music Studio" kisayolu olusturuldu.
)
timeout /t 3 >nul
