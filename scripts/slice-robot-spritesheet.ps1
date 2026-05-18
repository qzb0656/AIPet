Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$sourceCandidates = @(
  (Join-Path $root "assets\source\robot-spritesheet.png"),
  (Join-Path $root "assets\source\assetssourcerobot-spritesheet.png")
)
$sourcePath = $sourceCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
$outDir = Join-Path $root "assets\pet"

if (-not $sourcePath) {
  throw "Missing spritesheet. Put it at assets\source\robot-spritesheet.png"
}

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$source = [System.Drawing.Image]::FromFile($sourcePath)
$frames = @(
  @{ File = "pet-normal.png"; CenterX = 224; TopY = 45; Width = 300; Height = 350 },
  @{ File = "pet-happy.png"; CenterX = 525; TopY = 45; Width = 300; Height = 350 },
  @{ File = "pet-walking-1.png"; CenterX = 836; TopY = 45; Width = 300; Height = 350 },
  @{ File = "pet-thinking.png"; CenterX = 1108; TopY = 45; Width = 245; Height = 350 },
  @{ File = "pet-open-mouth.png"; CenterX = 1366; TopY = 45; Width = 300; Height = 350 },
  @{ File = "pet-surprised.png"; CenterX = 224; TopY = 535; Width = 300; Height = 330 },
  @{ File = "pet-chewing-1.png"; CenterX = 533; TopY = 535; Width = 300; Height = 330 },
  @{ File = "pet-chewing-2.png"; CenterX = 836; TopY = 535; Width = 300; Height = 330 },
  @{ File = "pet-eating.png"; CenterX = 1136; TopY = 535; Width = 300; Height = 330 },
  @{ File = "pet-error.png"; CenterX = 1366; TopY = 535; Width = 300; Height = 330 }
)

$motionFrames = @(
  @{ Source = "pet-normal.png"; File = "pet-normal-2.png"; X = 0; Y = 5 },
  @{ Source = "pet-happy.png"; File = "pet-happy-2.png"; X = 0; Y = -6 },
  @{ Source = "pet-walking-1.png"; File = "pet-walking-2.png"; X = 8; Y = 2 },
  @{ Source = "pet-thinking.png"; File = "pet-thinking-2.png"; X = -5; Y = 0 },
  @{ Source = "pet-error.png"; File = "pet-error-2.png"; X = -6; Y = 0 },
  @{ Source = "pet-surprised.png"; File = "pet-surprised-2.png"; X = 0; Y = -5 }
)

$derivedFrames = @(
  @{ Source = "pet-normal.png"; File = "pet-sleep.png"; Rotate = 0; X = 0; Y = 20 },
  @{ Source = "pet-normal.png"; File = "pet-sleep-2.png"; Rotate = 0; X = 0; Y = 26 },
  @{ Source = "pet-error.png"; File = "pet-angry.png"; Rotate = 0; X = 0; Y = 0 },
  @{ Source = "pet-error.png"; File = "pet-angry-2.png"; Rotate = 0; X = -8; Y = 0 },
  @{ Source = "pet-walking-1.png"; File = "pet-wall-climb.png"; Rotate = -18; X = -24; Y = 0 },
  @{ Source = "pet-walking-2.png"; File = "pet-wall-climb-2.png"; Rotate = -18; X = -24; Y = -12 }
)

try {
  foreach ($frame in $frames) {
    # Crop out the text label at the bottom of each cell.
    $cropWidth = [float]$frame.Width
    $cropHeight = [float]$frame.Height
    $cropX = [float]([Math]::Max(0, [Math]::Min($source.Width - $cropWidth, $frame.CenterX - ($cropWidth / 2))))
    $cropY = [float]$frame.TopY
    $sourceRect = [System.Drawing.RectangleF]::new($cropX, $cropY, $cropWidth, $cropHeight)

    $bitmap = [System.Drawing.Bitmap]::new(512, 512, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)

    # Keep the original aspect ratio. Do not stretch the robot into a square.
    $scale = [Math]::Min(512 / $cropWidth, 512 / $cropHeight)
    $drawWidth = [float]($cropWidth * $scale)
    $drawHeight = [float]($cropHeight * $scale)
    $drawX = [float]((512 - $drawWidth) / 2)
    $drawY = [float](512 - $drawHeight)
    $destRect = [System.Drawing.RectangleF]::new($drawX, $drawY, $drawWidth, $drawHeight)
    $graphics.DrawImage($source, $destRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)

    $outPath = Join-Path $outDir $frame.File
    $bitmap.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
  }
} finally {
  $source.Dispose()
}

foreach ($frame in $motionFrames) {
  $sourceFramePath = Join-Path $outDir $frame.Source
  $sourceFrame = [System.Drawing.Image]::FromFile($sourceFramePath)
  $bitmap = [System.Drawing.Bitmap]::new(512, 512, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  # Motion frames shift the whole image inside the transparent canvas.
  # This adds real frame changes without scaling the character.
  $destRect = [System.Drawing.RectangleF]::new([float]$frame.X, [float]$frame.Y, 512, 512)
  $graphics.DrawImage($sourceFrame, $destRect)

  $outPath = Join-Path $outDir $frame.File
  $bitmap.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
  $sourceFrame.Dispose()
}

foreach ($frame in $derivedFrames) {
  $sourceFramePath = Join-Path $outDir $frame.Source
  $sourceFrame = [System.Drawing.Image]::FromFile($sourceFramePath)
  $bitmap = [System.Drawing.Bitmap]::new(512, 512, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $graphics.TranslateTransform(256 + [float]$frame.X, 256 + [float]$frame.Y)
  $graphics.RotateTransform([float]$frame.Rotate)
  $graphics.TranslateTransform(-256, -256)
  $graphics.DrawImage($sourceFrame, [System.Drawing.RectangleF]::new(0, 0, 512, 512))

  if ($frame.File -like "pet-angry*") {
    $overlay = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(54, 255, 42, 42))
    $graphics.FillRectangle($overlay, 0, 0, 512, 512)
    $overlay.Dispose()
  }

  if ($frame.File -like "pet-sleep*") {
    $font = [System.Drawing.Font]::new("Arial", 48, [System.Drawing.FontStyle]::Bold)
    $textBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(220, 130, 235, 255))
    $graphics.DrawString("Zzz", $font, $textBrush, 320, 70)
    $font.Dispose()
    $textBrush.Dispose()
  }

  $outPath = Join-Path $outDir $frame.File
  $bitmap.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
  $sourceFrame.Dispose()
}

Write-Host "Generated robot pet sprites in $outDir"
