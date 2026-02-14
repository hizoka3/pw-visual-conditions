#!/bin/bash

DESTINO="./flattened"

CARPETAS=(
    "./assets"
    "./src"
    "./views"
)

# Archivos específicos del root que quieres incluir
ARCHIVOS_ROOT=(
    "./composer.json"
    "./flatten.sh"
    "./PW_VISUAL_CONDITIONS_CONTRACT.md"
)

EXTENSIONES_TEXTO=(
    "php" "js" "css" "html" "htm" "json" "xml" "txt" "md"
    "jsx" "tsx" "ts" "vue" "scss" "sass" "less"
    "yml" "yaml" "ini" "conf" "sh" "bash"
)

IGNORAR=(
    ".DS_Store"
    "Thumbs.db"
    ".gitkeep"
    "desktop.ini"
    ".htaccess"
)

mkdir -p "$DESTINO"

debe_ignorar() {
    local archivo="$1"
    local base
    base=$(basename "$archivo")
    for ignorado in "${IGNORAR[@]}"; do
        if [[ "$base" == "$ignorado" ]]; then
            return 0
        fi
    done
    return 1
}

es_texto_valido() {
    local archivo="$1"
    local extension="${archivo##*.}"
    for ext in "${EXTENSIONES_TEXTO[@]}"; do
        if [[ "$extension" == "$ext" ]]; then
            return 0
        fi
    done
    return 1
}

agregar_bom() {
    local archivo="$1"

    # Verificar si ya tiene BOM
    if head -c 3 "$archivo" | od -A n -t x1 | grep -q "ef bb bf"; then
        echo "    [BOM] Ya existe"
        return 0
    fi

    # Agregar BOM UTF-8 (EF BB BF)
    printf '\xEF\xBB\xBF' > "${archivo}.tmp"
    cat "$archivo" >> "${archivo}.tmp"
    mv "${archivo}.tmp" "$archivo"
    echo "    [BOM] Agregado ✓"
}

convertir_utf8() {
    local archivo="$1"
    local destino="$2"
    local encoding

    # Copiar archivo
    cp "$archivo" "$destino"

    # Detectar encoding
    encoding=$(file -b --mime-encoding "$destino")

    # Convertir a UTF-8 si no lo es
    if [ "$encoding" != "utf-8" ] && [ "$encoding" != "us-ascii" ]; then
        echo "    [CONV] $encoding → UTF-8"
        iconv -f "$encoding" -t UTF-8 "$destino" > "${destino}.tmp" 2>/dev/null && mv "${destino}.tmp" "$destino"
    fi

    # Normalizar line endings (CRLF → LF)
    if command -v dos2unix &> /dev/null; then
        dos2unix -q "$destino" 2>/dev/null
    else
        sed -i 's/\r$//' "$destino" 2>/dev/null || sed -i '' 's/\r$//' "$destino" 2>/dev/null
    fi

    # AGREGAR BOM UTF-8
    agregar_bom "$destino"
}

procesar_archivo() {
    local archivo="$1"
    local base=$(basename "$archivo")

    if debe_ignorar "$archivo"; then
        echo "  - Ignorado: $base"
        return
    fi

    if ! es_texto_valido "$archivo"; then
        echo "  - Ignorado: $base - binario"
        return
    fi

    destino="$DESTINO/$base"
    contador=1

    while [[ -e "$destino" ]]; do
        extension="${base##*.}"
        nombre="${base%.*}"

        if [[ "$nombre" == "$extension" ]]; then
            destino="$DESTINO/${nombre}_$contador"
        else
            destino="$DESTINO/${nombre}_$contador.$extension"
        fi

        contador=$((contador + 1))
    done

    echo "  -> Procesando: $base"
    convertir_utf8 "$archivo" "$destino"
    echo "  [OK] Completado"
}

echo "==> Iniciando proceso..."
echo ""

# Procesar archivos del root
echo ">> Procesando archivos del root"
for archivo in "${ARCHIVOS_ROOT[@]}"; do
    if [ -f "$archivo" ]; then
        procesar_archivo "$archivo"
    else
        echo "  [WARN] No encontrado: $archivo"
    fi
done
echo ""

# Procesar carpetas
for DIR in "${CARPETAS[@]}"; do
    if [ ! -d "$DIR" ]; then
        echo "[ERROR] Carpeta no encontrada: $DIR"
        continue
    fi

    echo ">> Procesando: $DIR"

    find "$DIR" -type f | while read -r archivo; do
        procesar_archivo "$archivo"
    done
done

echo ""
echo "==> PROCESO COMPLETADO"
echo ""

total=$(find "$DESTINO" -type f | wc -l | tr -d ' ')
echo "Archivos procesados: $total"
echo "Ubicación: $DESTINO"
echo ""

echo "Verificando encodings..."
find "$DESTINO" -type f -exec file -b --mime-encoding {} \; | sort | uniq -c
echo ""

echo "Verificando BOMs..."
bom_count=0
total_files=$(find "$DESTINO" -type f | wc -l | tr -d ' ')

find "$DESTINO" -type f | while read -r f; do
    if head -c 3 "$f" | od -A n -t x1 | grep -q "ef bb bf"; then
        ((bom_count++))
    fi
done

echo "[OK] Todos los archivos tienen BOM UTF-8"
echo ""
echo "==> Listo para subir a Claude"
echo ""
