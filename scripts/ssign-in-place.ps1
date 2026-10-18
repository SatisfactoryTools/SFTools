param([Parameter(Mandatory)][string]$File)

$ErrorActionPreference = 'Stop'

# ssign swaps the signed file in with a rename, which Windows refuses while anything
# (Defender, the bundler) still has the file open. Overwriting its contents is what
# signtool does, so sign into a separate folder and copy the bytes back.
$out = Join-Path ([IO.Path]::GetTempPath()) ("ssign-" + [guid]::NewGuid())
ssign -v -n 'Satisfactory Tools' -u 'https://satisfactorytools.com' -o $out $File
if ($LASTEXITCODE -ne 0) {
	exit $LASTEXITCODE
}

$signed = [IO.File]::ReadAllBytes((Join-Path $out (Split-Path $File -Leaf)))
for ($attempt = 1; ; $attempt++) {
	try {
		$stream = [IO.File]::Open($File, [IO.FileMode]::Truncate, [IO.FileAccess]::Write, [IO.FileShare]::ReadWrite)
		try {
			$stream.Write($signed, 0, $signed.Length)
		} finally {
			$stream.Dispose()
		}
		break
	} catch {
		if ($attempt -ge 10) {
			throw
		}
		Start-Sleep -Seconds 2
	}
}

Remove-Item -Recurse -Force $out
