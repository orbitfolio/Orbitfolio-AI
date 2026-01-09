#!/usr/bin/env pwsh
# Method 1: Protoc --decode_raw (Windows PowerShell equivalent of cat | protoc)

$protoc = "C:\Users\Bhavna\AppData\Local\Microsoft\WinGet\Packages\Google.Protobuf_Microsoft.Winget.Source_8wekyb3d8bbwe\bin\protoc.exe"
$pbFile = "$env:USERPROFILE\.gemini\antigravity\conversations\0cf50e01-1efd-402d-b5ab-6f5cb05d568b.pb"
$outputFile = Join-Path $PSScriptRoot "method1-protoc-output.txt"

Write-Host "📂 Method 1: Protoc --decode_raw"
Write-Host "Input: $pbFile"
Write-Host "Output: $outputFile"
Write-Host ""

try {
    # Read binary file and pipe to protoc
    $bytes = [System.IO.File]::ReadAllBytes($pbFile)
    
    # Take first 100KB as sample
    $sampleSize = [Math]::Min(102400, $bytes.Length)
    $sample = $bytes[0..($sampleSize-1)]
    
    # Write to temp file
    $tempFile = Join-Path $env:TEMP "conversation-sample.pb"
    [System.IO.File]::WriteAllBytes($tempFile, $sample)
    
    # Run protoc
    $result = & $protoc --decode_raw $tempFile 2>&1
    
    $result | Out-File $outputFile -Encoding UTF8
    
    Write-Host "✅ Decode complete. First 50 lines:"
    Get-Content $outputFile | Select-Object -First 50
    
} catch {
    Write-Host "❌ Error: $_"
    "Error: $_" | Out-File $outputFile
}
