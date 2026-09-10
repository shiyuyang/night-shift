$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try {
    $target = $env:NIGHTSHIFT_BOOTSTRAPPER
    Invoke-WebRequest -UseBasicParsing -TimeoutSec 120 -Uri 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile $target
    $signature = Get-AuthenticodeSignature -LiteralPath $target
    if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch '(^|,\s*)O=Microsoft Corporation(,|$)') {
        throw 'Invalid Microsoft installer signature'
    }
    $installer = Start-Process -FilePath $target -ArgumentList '/silent','/install' -PassThru
    $installer.WaitForExit()
    exit $installer.ExitCode
} catch {
    exit 1
}
