// Cierra la app de verdad. Destruir las ventanas desde JS no basta: la bandeja mantiene vivo el proceso.
#[tauri::command]
fn quit(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Una sola instancia: si se abre otra vez, no hace nada (las notas ya están visibles).
        .plugin(tauri_plugin_single_instance::init(|_, _, _| {}))
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .invoke_handler(tauri::generate_handler![quit])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
