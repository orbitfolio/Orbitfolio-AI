#!/usr/bin/env pwsh
# Method 2: Extract readable strings from binary (like Unix 'strings' command)

$pbFile = "$env:USERPROFILE\.gemini\antigravity\conversations\0cf50e01-1efd-402d-b5ab-6f5cb05d568b.pb"
$outputFile = Join-Path $PSScriptRoot "method2-strings-output.txt"

Write-Host "📂 Method 2: Extract ASCII Strings"
Write-Host "Input: $pbFile"
Write-Host "Output: $outputFile"
Write-Host ""

try {
    $bytes = [System.IO.File]::ReadAllBytes($pbFile)
    $strings = @()
    $currentString = ""
    $minLength = 4  # Minimum string length to keep
    
    Write-Host "⏳ Extracting strings from $($bytes.Length) bytes..."
    
    foreach ($byte in $bytes) {
        # Printable ASCII range (32-126)
        if ($byte -ge 32 -and $byte -le 126) {
            $currentString += [char]$byte
        } else {
            if ($currentString.Length -ge $minLength) {
                $strings += $currentString
            }
            $currentString = ""
        }
    }
    
    # Add final string if any
    if ($currentString.Length -ge $minLength) {
        $strings += $currentString
    }
    
    Write-Host "✅ Found $($strings.Length) readable strings"
    Write-Host ""
    
    # Save all strings
    $strings | Out-File $outputFile -Encoding UTF8
    
    # Look for likely user prompts (longer strings with certain keywords)
    $keywords = @('Build', 'Create', 'Add', 'Fix', 'Implement', 'portfolio', 'scoring', 'Orbit', 'AI', 'score')
    $likelyPrompts = $strings | Where-Object {
        $s = $_
        $s.Length -gt 20 -and ($keywords | Where-Object { $s -match $_ }).Count -gt 0
    }
    
    Write-Host "📝 Likely user prompts found: $($likelyPrompts.Length)"
    Write-Host ""
    Write-Host "=== FIRST 30 LIKELY PROMPTS ==="
    $likelyPrompts | Select-Object -First 30 | ForEach-Object { Write-Host $_ }
    
    # Save to separate file
    $promptsFile = Join-Path $PSScriptRoot "method2-likely-prompts.txt"
    $likelyPrompts | Out-File $promptsFile -Encoding UTF8
    
    Write-Host ""
    Write-Host "📄 All strings saved to: $outputFile"
    Write-Host "📄 Likely prompts saved to: $promptsFile"
    
} catch {
    Write-Host "❌ Error: $_"
}
