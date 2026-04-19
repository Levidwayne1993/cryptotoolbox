# fix-encoding.ps1 — Run from C:\Users\citys\Documents\cryptotoolbox
$replacements = @{
    'ðŸš€' = '🚀'; 'ðŸ"‰' = '📉'; 'ðŸ'±' = '💱'; 'ðŸ"Š' = '📊'
    'ðŸ'¼' = '💼'; 'ðŸ"¡' = '📡'; 'ðŸ"°' = '📰'; 'ðŸ"§' = '🔧'
    'ðŸ"„' = '🔄'; 'ðŸ"œ' = '📜'; 'ðŸŸ¢' = '🟢'; 'ðŸ"´' = '🔴'
    'âš ï¸' = '⚠️'; 'âš⠏' = '⚠️'; 'âšª' = '⚪'
    'â–²' = '▲'; 'â–¼' = '▼'; 'â€"' = '—'
    'â€œ' = '"'; 'â€' = '"'; 'â€™' = "'"
}
$files = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts" -File
$totalFixed = 0
foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $fixCount = 0
    foreach ($key in $replacements.Keys) {
        if ($content.Contains($key)) {
            $occurrences = ([regex]::Matches($content, [regex]::Escape($key))).Count
            $content = $content.Replace($key, $replacements[$key])
            $fixCount += $occurrences
        }
    }
    if ($fixCount -gt 0) {
        [System.IO.File]::WriteAllText($file.FullName, $content, (New-Object System.Text.UTF8Encoding $true))
        Write-Host "  Fixed $fixCount chars in $($file.FullName)" -ForegroundColor Green
        $totalFixed += $fixCount
    }
}
Write-Host "Done! Fixed $totalFixed total garbled characters."
