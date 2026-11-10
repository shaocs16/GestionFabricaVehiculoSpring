use std::{
    fs,
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    path::{Path, PathBuf},
};

fn content_type(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
    {
        "html" => "text/html; charset=utf-8",
        "js" => "text/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "json" => "application/json; charset=utf-8",
        "md" => "text/markdown; charset=utf-8",
        "svg" => "image/svg+xml",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        _ => "application/octet-stream",
    }
}

fn serve(mut stream: TcpStream, dist: &Path) -> std::io::Result<()> {
    let mut buffer = [0_u8; 8192];
    let size = stream.read(&mut buffer)?;
    let request = String::from_utf8_lossy(&buffer[..size]);
    let target = request
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .unwrap_or("/");
    let clean = target
        .split(['?', '#'])
        .next()
        .unwrap_or("/")
        .trim_start_matches('/');
    let requested = if clean.is_empty() {
        dist.join("index.html")
    } else {
        dist.join(clean.replace('/', std::path::MAIN_SEPARATOR_STR))
    };
    let safe_path = if requested.starts_with(dist) && requested.is_file() {
        requested
    } else {
        dist.join("index.html")
    };
    let body = fs::read(&safe_path)?;
    let headers = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: {}\r\nContent-Length: {}\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n",
        content_type(&safe_path),
        body.len()
    );
    stream.write_all(headers.as_bytes())?;
    stream.write_all(&body)
}

fn main() -> std::io::Result<()> {
    let dist = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("dist");
    if !dist.join("index.html").exists() {
        eprintln!("No existe dist/index.html. Ejecuta `npm run build:frontend`.");
        std::process::exit(1);
    }
    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".into());
    let listener = TcpListener::bind(format!("127.0.0.1:{port}"))?;
    println!("Explorador disponible en http://127.0.0.1:{port}");
    for connection in listener.incoming() {
        match connection {
            Ok(stream) => {
                if let Err(error) = serve(stream, &dist) {
                    eprintln!("Petición fallida: {error}");
                }
            }
            Err(error) => eprintln!("Conexión fallida: {error}"),
        }
    }
    Ok(())
}
