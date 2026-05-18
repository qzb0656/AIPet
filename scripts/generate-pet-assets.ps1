Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "assets\pet"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-Brush($hex) {
  return New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($hex))
}

function New-Pen($hex, $width = 1) {
  $pen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($hex), $width)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  return $pen
}

function Add-RoundedRect($graphics, $brush, $pen, $x, $y, $w, $h, $r) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  if ($brush) { $graphics.FillPath($brush, $path) }
  if ($pen) { $graphics.DrawPath($pen, $path) }
  $path.Dispose()
}

function Draw-Sparkle($g, $x, $y, $size) {
  $pen = New-Pen "#FFD35A" 7
  $g.DrawLine($pen, $x, $y - $size, $x, $y + $size)
  $g.DrawLine($pen, $x - $size, $y, $x + $size, $y)
  $pen.Dispose()
}

function Draw-File($g, $x, $y, $w, $h, $angle = 0) {
  $state = $g.Save()
  $g.TranslateTransform($x + $w / 2, $y + $h / 2)
  $g.RotateTransform($angle)
  $g.TranslateTransform(-($x + $w / 2), -($y + $h / 2))

  $paper = New-Brush "#7D74D8"
  $fold = New-Brush "#A89DF2"
  $linePen = New-Pen "#FFFFFF" 7
  $edgePen = New-Pen "#44347F" 5

  Add-RoundedRect $g $paper $edgePen $x $y $w $h 10
  $points = @(
    [System.Drawing.PointF]::new($x + $w - 36, $y),
    [System.Drawing.PointF]::new($x + $w, $y + 36),
    [System.Drawing.PointF]::new($x + $w - 36, $y + 36)
  )
  $g.FillPolygon($fold, $points)
  $g.DrawLine($linePen, $x + 30, $y + 66, $x + 52, $y + 48)
  $g.DrawLine($linePen, $x + 30, $y + 66, $x + 52, $y + 84)
  $g.DrawLine($linePen, $x + $w - 30, $y + 66, $x + $w - 52, $y + 48)
  $g.DrawLine($linePen, $x + $w - 30, $y + 66, $x + $w - 52, $y + 84)

  $paper.Dispose(); $fold.Dispose(); $linePen.Dispose(); $edgePen.Dispose()
  $g.Restore($state)
}

function Draw-Robot($g, $stateName) {
  $shell = New-Brush "#F6F2FF"
  $shellShade = New-Brush "#D9CFFF"
  $dark = New-Brush "#141B35"
  $purple = New-Brush "#8166D6"
  $cyan = New-Brush "#63F0DE"
  $shadow = New-Brush "#2A214D"
  $outline = New-Pen "#302653" 7
  $softOutline = New-Pen "#6751AF" 4
  $cyanPen = New-Pen "#63F0DE" 9
  $mouthPen = New-Pen "#63F0DE" 7

  $g.FillEllipse($shadow, 120, 438, 272, 34)

  $antennaPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $antennaPath.AddBezier(248, 96, 230, 56, 282, 38, 284, 78)
  $antennaPath.AddBezier(284, 78, 284, 112, 236, 104, 260, 76)
  $g.DrawPath($softOutline, $antennaPath)
  $antennaPath.Dispose()

  $g.FillEllipse($purple, 94, 300, 80, 138)
  $g.FillEllipse($purple, 338, 300, 80, 138)
  $g.FillEllipse($dark, 96, 416, 58, 38)
  $g.FillEllipse($dark, 358, 416, 58, 38)

  $bodyPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $bodyPath.AddBezier(103, 259, 102, 150, 160, 82, 256, 82)
  $bodyPath.AddBezier(256, 82, 352, 82, 410, 150, 409, 259)
  $bodyPath.AddBezier(409, 259, 408, 381, 344, 440, 256, 440)
  $bodyPath.AddBezier(256, 440, 168, 440, 104, 381, 103, 259)
  $bodyPath.CloseFigure()
  $g.FillPath($shell, $bodyPath)
  $g.DrawPath($outline, $bodyPath)
  $bodyPath.Dispose()

  $g.FillEllipse($shellShade, 162, 362, 188, 66)

  $g.FillEllipse($shell, 64, 286, 102, 110)
  $g.DrawEllipse($outline, 64, 286, 102, 110)
  $g.FillEllipse($shell, 346, 286, 102, 110)
  $g.DrawEllipse($outline, 346, 286, 102, 110)
  $g.FillEllipse($dark, 74, 364, 42, 42)
  $g.FillEllipse($dark, 396, 364, 42, 42)

  Add-RoundedRect $g $dark $outline 130 136 252 154 70
  $highlightPen = New-Pen "#FFFFFF" 8
  $g.DrawArc($highlightPen, 158, 150, 98, 52, 195, 80)
  $highlightPen.Dispose()

  $leftEye = [System.Drawing.Rectangle]::new(178, 202, 36, 58)
  $rightEye = [System.Drawing.Rectangle]::new(298, 202, 36, 58)

  if ($stateName -in @("happy", "eating", "full")) {
    $g.DrawArc($cyanPen, 176, 214, 42, 34, 205, 130)
    $g.DrawArc($cyanPen, 294, 214, 42, 34, 205, 130)
    $g.DrawArc($mouthPen, 236, 240, 40, 30, 15, 150)
  } elseif ($stateName -eq "thinking") {
    $g.FillEllipse($cyan, $leftEye)
    $g.FillEllipse($cyan, $rightEye)
    $g.DrawArc($mouthPen, 236, 247, 38, 18, 195, 150)
  } elseif ($stateName -eq "error") {
    $g.DrawArc($cyanPen, 176, 232, 42, 28, 25, 130)
    $g.DrawArc($cyanPen, 294, 232, 42, 28, 25, 130)
    $g.DrawArc($mouthPen, 238, 258, 36, 18, 205, 130)
    $tear = New-Brush "#7EEBFF"
    $g.FillEllipse($tear, 160, 260, 18, 32)
    $g.FillEllipse($tear, 334, 260, 18, 32)
    $tear.Dispose()
  } elseif ($stateName -eq "open-mouth") {
    $g.FillEllipse($cyan, $leftEye)
    $g.FillEllipse($cyan, $rightEye)
    $g.FillEllipse($cyan, 236, 242, 40, 46)
    $g.FillEllipse($dark, 245, 250, 22, 28)
  } elseif ($stateName -eq "chewing") {
    $g.DrawArc($cyanPen, 176, 214, 42, 34, 205, 130)
    $g.DrawArc($cyanPen, 294, 214, 42, 34, 205, 130)
    $g.DrawLine($mouthPen, 238, 260, 274, 260)
  } else {
    $g.FillEllipse($cyan, $leftEye)
    $g.FillEllipse($cyan, $rightEye)
    $g.DrawArc($mouthPen, 238, 248, 38, 28, 20, 140)
  }

  $symbolPen = New-Pen "#63F0DE" 8
  $g.DrawLine($symbolPen, 230, 164, 210, 180)
  $g.DrawLine($symbolPen, 210, 180, 230, 196)
  $g.DrawLine($symbolPen, 282, 164, 302, 180)
  $g.DrawLine($symbolPen, 302, 180, 282, 196)

  Add-RoundedRect $g $purple $outline 202 316 108 68 24
  $whitePen = New-Pen "#FFFFFF" 7
  $g.DrawLine($whitePen, 236, 336, 218, 350)
  $g.DrawLine($whitePen, 218, 350, 236, 364)
  $g.DrawLine($whitePen, 276, 336, 294, 350)
  $g.DrawLine($whitePen, 294, 350, 276, 364)
  $badgeDot = New-Brush "#D8D0FF"
  $g.FillEllipse($badgeDot, 251, 370, 10, 10)
  $badgeDot.Dispose()

  if ($stateName -eq "happy") {
    Draw-Sparkle $g 86 150 18
    Draw-Sparkle $g 410 126 22
    Draw-Sparkle $g 432 184 13
  } elseif ($stateName -eq "thinking") {
    $font = New-Object System.Drawing.Font("Arial", 72, [System.Drawing.FontStyle]::Bold)
    $questionBrush = New-Brush "#76BCE8"
    $g.DrawString("?", $font, $questionBrush, 380, 82)
    $font.Dispose()
    $questionBrush.Dispose()
    $g.FillEllipse($shell, 82, 304, 86, 96)
    $g.DrawEllipse($outline, 82, 304, 86, 96)
  } elseif ($stateName -eq "eating") {
    Draw-File $g 210 320 92 118 0
    $cookie = New-Brush "#8E633F"
    $g.FillEllipse($cookie, 220, 262, 76, 76)
    $cookie.Dispose()
  } elseif ($stateName -eq "open-mouth") {
    Draw-File $g 344 274 90 118 0
  } elseif ($stateName -eq "chewing") {
    Draw-File $g 214 318 96 118 -3
  } elseif ($stateName -eq "full") {
    Draw-Sparkle $g 388 154 18
    Draw-Sparkle $g 420 190 12
  } elseif ($stateName -eq "error") {
    $errPen = New-Pen "#6E618A" 8
    $g.DrawArc($errPen, 390, 116, 54, 40, 190, 300)
    $g.DrawArc($errPen, 400, 132, 40, 28, 190, 300)
    $g.DrawArc($errPen, 410, 146, 24, 18, 190, 300)
    $errPen.Dispose()
  }

  $shell.Dispose(); $shellShade.Dispose(); $dark.Dispose(); $purple.Dispose(); $cyan.Dispose()
  $shadow.Dispose(); $outline.Dispose(); $softOutline.Dispose(); $cyanPen.Dispose(); $mouthPen.Dispose()
  $symbolPen.Dispose(); $whitePen.Dispose()
}

function Save-PetImage($fileName, $stateName) {
  $bitmap = New-Object System.Drawing.Bitmap 512, 512, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.Color]::Transparent)

  Draw-Robot $graphics $stateName

  $path = Join-Path $outDir $fileName
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

Save-PetImage "pet-normal.png" "normal"
Save-PetImage "pet-happy.png" "happy"
Save-PetImage "pet-thinking.png" "thinking"
Save-PetImage "pet-eating.png" "eating"
Save-PetImage "pet-error.png" "error"
Save-PetImage "pet-open-mouth.png" "open-mouth"
Save-PetImage "pet-chewing.png" "chewing"
Save-PetImage "pet-full.png" "full"

Write-Host "Generated pet PNG assets in $outDir"
