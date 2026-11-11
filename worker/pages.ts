export const NOT_FOUND_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Link not found · Dealseek links</title>
<style>
body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#fafafa;color:#18181b}
main{text-align:center;padding:16px}
a{color:#2563eb}
@media (prefers-color-scheme:dark){body{background:#18181b;color:#fafafa}a{color:#60a5fa}}
</style>
</head>
<body>
<main>
<h1>Link not found</h1>
<p>This short link doesn't exist or has been removed.</p>
<p><a href="/">Shorten a new link</a></p>
</main>
</body>
</html>
`

export const REVOKED_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Link removed · Dealseek links</title>
<style>
body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#fafafa;color:#18181b}
main{text-align:center;padding:16px}
a{color:#2563eb}
@media (prefers-color-scheme:dark){body{background:#18181b;color:#fafafa}a{color:#60a5fa}}
</style>
</head>
<body>
<main>
<h1>Link removed</h1>
<p>This link was removed by its creator.</p>
<p><a href="/">Shorten a new link</a></p>
</main>
</body>
</html>
`

export const TOO_MANY_LOOKUPS_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Slow down · Dealseek links</title>
<style>
body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#fafafa;color:#18181b}
main{text-align:center;padding:16px}
a{color:#2563eb}
@media (prefers-color-scheme:dark){body{background:#18181b;color:#fafafa}a{color:#60a5fa}}
</style>
</head>
<body>
<main>
<h1>Too many missing links</h1>
<p>You've opened a lot of short links that don't exist. Wait a minute and try again.</p>
<p><a href="/">Shorten a new link</a></p>
</main>
</body>
</html>
`
