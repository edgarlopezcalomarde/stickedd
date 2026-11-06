<p align="center">
  <img src="assets/logo.svg" alt="stickedd" width="140">
</p>

<h1 align="center">stickedd</h1>
<p align="center"><b>Tus notas, siempre a mano.</b><br>Notas adhesivas flotantes para el escritorio de Windows.</p>

## Instalar (1 comando)

Abre **PowerShell** y pega:

```powershell
irm https://raw.githubusercontent.com/edgarlopezcalomarde/stickedd/main/install.ps1 | iex
```

Descarga el instalador de la última versión, lo instala sin preguntas y abre la app. Stickedd queda en la bandeja del sistema (junto al reloj).

> También puedes bajar el instalador `.exe` a mano desde [Releases](https://github.com/edgarlopezcalomarde/stickedd/releases/latest).

## Cómo se usa

- **Clic izquierdo** en el icono de la bandeja: nueva nota.
- **Clic derecho** en el icono: Nueva nota · Gestionar notas · Salir.
- **Doble clic** en una nota: editarla. **Clic derecho** en una nota: editar, fijar, archivar o eliminar.
- En modo edición: color (paleta o color propio), tamaño de letra, listas, listas con checkbox, imágenes con marco ajustable e imagen de fondo.
- **Fijar** deja la nota siempre visible y bloquea su posición y tamaño.
- Los botones de la barra superior de la nota se eligen y ordenan en *Gestionar notas → Personalizar*.

Las notas se guardan en una base de datos SQLite local; nada sale de tu equipo.

## Compilar desde el código

Necesitas [Bun](https://bun.sh), [Rust](https://rustup.rs) y las *Build Tools* de Visual Studio (C++).

```powershell
git clone https://github.com/edgarlopezcalomarde/stickedd.git
cd stickedd
bun install
bun --bun run tauri dev      # desarrollo
bun --bun run tauri build    # genera el instalador en src-tauri/target/release/bundle/nsis
```

---

Hecho con Tauri 2 · React 19 · Tailwind 4 · SQLite.
