@echo off
setlocal

rem === bootstrap.bat =========================================================
rem Scaffold a new project from this template in one command: copy the template
rem files into a new folder, fill the project name + today's date, make a working
rem .env from .env.example, verify .env is git-ignored, then git init + first
rem commit. Prints success only after it verifies the commit actually exists.
rem
rem Usage:  bootstrap.bat "C:\path\to\NewProject" [--force]
rem   --force  scaffold into an existing NON-EMPTY folder (default: refuse).
rem ===========================================================================

set "SRC=%~dp0"
set "DEST=%~1"
set "FORCE=%~2"

if "%DEST%"=="" (
  echo Usage: bootstrap.bat "C:\path\to\NewProject" [--force]
  echo   Creates the folder, copies the template in, fills name+date, git-inits.
  exit /b 1
)

rem Strip a trailing backslash so the folder-name derivation is reliable.
if "%DEST:~-1%"=="\" set "DEST=%DEST:~0,-1%"

rem Derive the project name from the destination leaf folder.
for %%I in ("%DEST%") do set "PROJNAME=%%~nxI"

rem Refuse a non-empty destination unless --force is given.
set "COUNT=0"
if exist "%DEST%\" for /f %%A in ('dir /b /a "%DEST%" 2^>nul ^| find /c /v ""') do set "COUNT=%%A"
if not "%COUNT%"=="0" if /i not "%FORCE%"=="--force" (
  echo Destination "%DEST%" already exists and is not empty.
  echo Pass  --force  as the second argument to scaffold into it anyway.
  exit /b 1
)

rem Template files to copy. bootstrap.bat itself is intentionally excluded.
set "FILES=CONTEXT.md CLAUDE.md AGENTS.md SECURITY.md .gitignore .gitattributes .editorconfig .env.example"

if not exist "%DEST%" (
  echo Creating "%DEST%"
  mkdir "%DEST%" || (echo ERROR: could not create folder. & exit /b 1)
)

for %%F in (%FILES%) do (
  if exist "%SRC%%%F" (
    copy /y "%SRC%%%F" "%DEST%\%%F" >nul
  ) else (
    echo WARNING: template file missing in source: %%F
  )
)

rem Verify the copies landed (call-time expansion avoids delayed-expansion setup).
set "MISSING="
for %%F in (%FILES%) do if not exist "%DEST%\%%F" call set "MISSING=%%MISSING%% %%F"
if defined MISSING echo WARNING: these files did not copy:%MISSING%

if not exist "%DEST%\CONTEXT.md" (
  echo ERROR: CONTEXT.md was not copied - aborting.
  exit /b 1
)

rem Fill project name and today's date into the copied CONTEXT.md (UTF-8, no BOM).
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=[char]0x27E8;$q=[char]0x27E9;$f='%DEST%\CONTEXT.md';$c=[IO.File]::ReadAllText($f);$c=$c -replace [regex]::Escape($p+'PROJECT NAME'+$q),'%PROJNAME%';$c=$c -replace ('(\*\*Last updated:\*\* )'+$p+'YYYY-MM-DD'+$q),('${1}'+(Get-Date -Format 'yyyy-MM-dd'));[IO.File]::WriteAllText($f,$c)"

rem Make the working .env from the example, but never clobber an existing one.
if exist "%DEST%\.env.example" if not exist "%DEST%\.env" copy /y "%DEST%\.env.example" "%DEST%\.env" >nul

pushd "%DEST%"

where git >nul 2>nul
if errorlevel 1 goto :no_git

if exist ".git" (
  echo.
  echo A git repo already exists here; skipping git init/commit.
  goto :check_env
)

git init >nul 2>nul
if errorlevel 1 (
  echo ERROR: git init failed.
  popd
  exit /b 1
)
git add . 2>nul
git commit -m "chore: scaffold project from template" >nul 2>nul
git rev-parse --verify HEAD >nul 2>nul
if errorlevel 1 (
  echo.
  echo WARNING: git commit did not complete - is user.name/user.email set?
  echo The files are in place; run  git commit  yourself once git is configured.
) else (
  echo.
  echo Initialised git repo and made the first commit.
)

:check_env
git check-ignore .env >nul 2>nul
if errorlevel 1 (
  echo WARNING: .env is NOT git-ignored here - do not commit real keys until it is.
) else (
  echo Verified: .env is git-ignored, so pasted keys will not be committed.
)
goto :after_git

:no_git
echo.
echo Files copied. git was not found on PATH, so git init was skipped.
echo Run this yourself once git is available:
echo    git init ^&^& git add . ^&^& git commit -m "chore: scaffold project from template"

:after_git
popd

rem Report any angle-bracket placeholders still to fill in.
powershell -NoProfile -Command "$p=[char]0x27E8;$files=@('%DEST%\CONTEXT.md','%DEST%\CLAUDE.md','%DEST%\AGENTS.md','%DEST%\SECURITY.md')|Where-Object{Test-Path $_};$m=Select-String -LiteralPath $files -Pattern ([regex]::Escape($p)) -AllMatches -ErrorAction SilentlyContinue;if($m){Write-Host ('Placeholders still to fill: '+$m.Count+' line(s). Search for the '+$p+' character in CONTEXT.md.')}else{Write-Host 'No angle-bracket placeholders remain.'}"

echo.
echo Done: %PROJNAME%
echo Next: open "%DEST%\CONTEXT.md", fill the remaining placeholders, delete the
echo startup comment block, and paste your keys into "%DEST%\.env".
endlocal
