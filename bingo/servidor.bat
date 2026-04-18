@echo off
title Bingo Armindo — Servidor Local
echo.
echo  ==========================================
echo   🎱  BINGO ARMINDO — Party Edition
echo   A iniciar servidor local...
echo  ==========================================
echo.

:: Tenta Python 3
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo  ✅ Python encontrado. A iniciar servidor na porta 8080...
    echo.
    echo  👉 Abre o browser em: http://localhost:8080
    echo  👉 Partilha com amigos na mesma rede: http://[O_TEU_IP]:8080
    echo.
    echo  Para saber o teu IP: abre outra janela de CMD e corre 'ipconfig'
    echo.
    echo  (Fecha esta janela para parar o servidor)
    echo.
    python -m http.server 8080
    goto :end
)

:: Tenta Node.js com npx
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo  ✅ Node.js encontrado. A instalar e iniciar servidor...
    echo.
    echo  👉 Abre o browser em: http://localhost:8080
    echo.
    echo  (Fecha esta janela para parar o servidor)
    echo.
    npx --yes serve -p 8080 .
    goto :end
)

:: Nenhum encontrado
echo  ❌ Nem Python nem Node.js encontrados!
echo.
echo  Instala uma destas opções:
echo   • Python: https://www.python.org/downloads/
echo   • Node.js: https://nodejs.org/
echo.
echo  OU usa a versão online (ver README.md)
echo.
pause
:end
