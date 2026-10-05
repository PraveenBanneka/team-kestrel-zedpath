# Opens each .docx in Microsoft Word (invisible), refreshes the table of contents and fields,
# saves the .docx, and exports a .pdf next to it. Called by build.js.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Files)

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  foreach ($f in $Files) {
    $full = (Resolve-Path $f).Path
    $doc = $word.Documents.Open($full, $false, $false, $false)
    # Order matters: caption numbers (SEQ) -> contents and lists -> page numbers inside them.
    # Word keeps "List of figures/tables" (TOC \c fields) in TablesOfFigures, not TablesOfContents.
    $doc.Fields.Update() | Out-Null
    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    foreach ($tof in $doc.TablesOfFigures)  { $tof.Update() }
    $doc.Repaginate()
    foreach ($toc in $doc.TablesOfContents) { $toc.UpdatePageNumbers() }
    foreach ($tof in $doc.TablesOfFigures)  { $tof.UpdatePageNumbers() }
    $doc.Save()
    $pdf = [System.IO.Path]::ChangeExtension($full, '.pdf')
    $doc.ExportAsFixedFormat($pdf, 17, $false, 0, 0, 1, 1, 0, $true, $true, 1)   # 17 = PDF; bookmarks from headings
    $doc.Close($false)
    Write-Host "  pdf:  $pdf"
  }
} finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
