Param(
  [switch]$Dev
)

Write-Host "Instalando dependências (npm ci)..." -ForegroundColor Cyan
if (Test-Path package-lock.json) { npm ci } else { npm install }
if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar dependências." }

Write-Host "Aplicando schema do banco (npm run db:setup)..." -ForegroundColor Cyan
npm run db:setup
if ($LASTEXITCODE -ne 0) { throw "Falha ao configurar o banco." }

if ($Dev) {
  Write-Host "Iniciando em modo dev (nodemon)..." -ForegroundColor Cyan
  npm run dev
} else {
  Write-Host "Iniciando servidor..." -ForegroundColor Cyan
  npm start
}
