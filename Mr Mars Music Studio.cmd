@echo off
rem Mr. Mars Music Studio All in 1 - MRH DGN - kurulumsuz, tasinabilir baslatici.
rem Tum ayarlar ve projeler bu klasordeki "veri" dizininde tutulur; klasoru USB'ye kopyalamaniz yeterli.
setlocal EnableDelayedExpansion
set "APP=%~dp0"
set "PROFILE=%APP%veri\profil"
set "P=%APP:\=/%"
set "URL=file:///!P: =%%20!index.html"
set "BR="
for %%X in ("%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" "%LocalAppData%\Microsoft\Edge\Application\msedge.exe" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%LocalAppData%\Google\Chrome\Application\chrome.exe") do (
  if not defined BR if exist "%%~X" set "BR=%%~X"
)
if "%~1"=="--url" ( echo !URL! & echo !BR! & exit /b )
if not defined BR (
  echo Microsoft Edge veya Google Chrome bulunamadi. index.html dosyasini Chromium tabanli bir tarayicida acin.
  start "" "%APP%index.html"
  exit /b
)
if not exist "%PROFILE%" mkdir "%PROFILE%"
start "" "%BR%" --app="%URL%" --user-data-dir="%PROFILE%" --no-first-run --no-default-browser-check --autoplay-policy=no-user-gesture-required --allow-file-access-from-files --use-fake-ui-for-media-stream --disable-features=Translate,msUndersideButton --start-maximized
