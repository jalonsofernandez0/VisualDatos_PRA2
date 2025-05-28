import Papa from 'papaparse'; // Para procesar el CSV
import ScrollyTeller from 'scrollyteller';  // La librería ScrollyTeller

// Seleccionar el contenedor donde se cargará la visualización
const scrollyContainer = document.getElementById('scrolly-teller');

// Inicializamos el ScrollyTeller sin contenido
let scrollyTeller = new ScrollyTeller({
    selector: '#scrolly-teller',
    content: []  // Sin contenido hasta que los datos sean procesados
});

// Leer los datos desde el archivo CSV
Papa.parse('data.csv', {
    download: true,
    complete: function(results) {
        console.log('Datos cargados:', results.data); // Mostrar los datos cargados en la consola
        crearDashboard(results.data);  // Función para crear el dashboard
    },
    error: function(error) {
        console.error('Error al cargar el CSV:', error);
    }
});

// Función para crear el dashboard después de cargar los datos
function crearDashboard(datos) {
    // Aquí es donde crearás las visualizaciones con los datos procesados
    // Esto se actualizará una vez tengamos los datos

    // Generar el contenido dinámico para el ScrollyTeller
    const contenido = [
        {
            type: 'text',
            text: 'Bienvenido al Dashboard interactivo. ¡Vamos a procesar los datos!',
            scrollPercent: 0
        },
        {
            type: 'text',
            text: 'Procesando datos... Espera un momento.',
            scrollPercent: 25
        },
        {
            type: 'chart',  // Esta es una visualización dinámica
            chartType: 'bar',  // Tipo de gráfico, puede ser "line", "bar", etc.
            data: datos,  // Los datos del CSV
            scrollPercent: 75  // Aparece al 75% del scroll
        },
        {
            type: 'text',
            text: '¡Gracias por ver el dashboard!',
            scrollPercent: 100
        }
    ];

    // Actualizar el ScrollyTeller con el nuevo contenido
    scrollyTeller.setContent(contenido);

    // Llamar al método de actualización del ScrollyTeller
    scrollyTeller.update();
}