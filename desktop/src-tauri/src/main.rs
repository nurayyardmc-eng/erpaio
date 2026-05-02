// ERPAIO desktop entry — sadece pencere açar, web app'i yükler
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    erpaio_desktop_lib::run();
}
