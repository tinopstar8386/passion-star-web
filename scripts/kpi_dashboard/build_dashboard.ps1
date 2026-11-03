$spreadsheetId = "1NCd7WbR982EDzdfJ7bDJzvxxeGDFffVUb9fKNPGeFBg"
$dashSheetId = 865830553

Write-Host "1. Unmerging existing ranges on KPI_DASHBOARD..."
$unmergeReq = @{
    requests = @(
        @{
            unmergeCells = @{
                range = @{
                    sheetId = $dashSheetId
                    startRowIndex = 0
                    endRowIndex = 60
                    startColumnIndex = 0
                    endColumnIndex = 20
                }
            }
        }
    )
}
$json = $unmergeReq | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText("$PSScriptRoot\req_unmerge.json", $json, [System.Text.UTF8Encoding]::new($false))
gsheets mutate raw-batch $spreadsheetId -f "$PSScriptRoot\req_unmerge.json"
Write-Host "Unmerge success!"
