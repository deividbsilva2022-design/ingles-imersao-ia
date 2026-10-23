@echo off
chcp 65001 > nul
title Sincronizador Automático de Dashboards • Inglês com IA
echo ======================================================================
echo   🎙️  Sincronizador Automático de Dashboards de Inglês
echo   Vigiando alterações em registro-aulas.md em tempo real...
echo   Qualquer aula adicionada atualizará o dashboard.html instantaneamente!
echo ======================================================================
echo.
python sync_dashboards.py --watch
pause
