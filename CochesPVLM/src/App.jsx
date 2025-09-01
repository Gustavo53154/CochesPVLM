import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import "./App.css"; // 👈 aquí importamos el CSS para responsive

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

function App() {
  const [numeroCoche, setNumeroCoche] = useState("");
  const [ubicacion, setUbicacion] = useState("Salida Por Tango");
  const [reportes, setReportes] = useState([]);
  const [coches, setCoches] = useState([]);
  const [buscarCoche, setBuscarCoche] = useState("");
  const [resultadoBusqueda, setResultadoBusqueda] = useState(null);

  // --- Fetch reportes y coches
  const fetchReportes = async () => {
    try {
      const { data, error } = await supabase
        .from("Reportes")
        .select("*")
        .order("FechaHora", { ascending: false });
      if (error) throw error;
      setReportes(data);
    } catch (err) {
      console.error(err);
      alert("Error cargando reportes.");
    }
  };

  const fetchCoches = async () => {
    try {
      const { data, error } = await supabase.from("Coches").select("*");
      if (error) throw error;
      setCoches(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReportes();
    fetchCoches();

    const subscription = supabase
      .channel("realtime-reportes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Reportes" },
        () => {
          fetchReportes();
          fetchCoches();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  const handleGuardar = async () => {
    if (!numeroCoche) return;

    const cocheId = Number(numeroCoche);
    const nCPU = 1;

    try {
      const { error: updateError } = await supabase
        .from("Coches")
        .update({ UbicacionActual: ubicacion })
        .eq("idCoche", cocheId);
      if (updateError) throw updateError;

      const { error: insertError } = await supabase.from("Reportes").insert([
        {
          FechaHora: new Date().toISOString(),
          IdCoche: cocheId,
          Ubicacion: ubicacion,
          NCPU: nCPU,
        },
      ]);
      if (insertError) throw insertError;

      setNumeroCoche("");
      fetchCoches();
      fetchReportes();
    } catch (err) {
      console.error(err);
      alert("Error guardando el reporte.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // evita submit en mobile
      handleGuardar();
    }
  };

  // --- Buscar coche
  const handleBuscar = () => {
    if (!buscarCoche) {
      setResultadoBusqueda(null);
      return;
    }
    const reporte = reportes.find((r) => r.IdCoche === Number(buscarCoche));
    setResultadoBusqueda(reporte || null);
  };

  const handleBuscarKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBuscar();
    }
  };

  // --- Pie chart
  const cochesEnTienda = coches.filter((c) => c.UbicacionActual === "En Tienda").length;
  const cochesEnRiesgo = coches.filter((c) => c.UbicacionActual === "Salida Por Tango").length;

  const pieData = {
    labels: [
      `Coches En Tienda (${cochesEnTienda})`,
      `Coches En Riesgo (${cochesEnRiesgo})`,
    ],
    datasets: [
      {
        data: [cochesEnTienda, cochesEnRiesgo],
        backgroundColor: ["green", "red"],
        hoverOffset: 10,
      },
    ],
  };

  // --- Bar chart y detalle
  const now = new Date();
  const ultimosReportes = reportes.reduce((acc, r) => {
    if (!acc[r.IdCoche]) acc[r.IdCoche] = r;
    return acc;
  }, {});
  const reportesRiesgo = Object.values(ultimosReportes).filter(
    (r) => r.Ubicacion === "Salida Por Tango"
  );

  const counts = [0, 0, 0, 0];
  const cochesPorRango = { "<5 min": [], "5-10 min": [], "10-60 min": [], ">60 min": [] };

  reportesRiesgo.forEach((r) => {
    const diffMin = (now - new Date(r.FechaHora)) / 1000 / 60;
    if (diffMin < 5) {
      counts[0]++;
      cochesPorRango["<5 min"].push(r.IdCoche);
    } else if (diffMin < 10) {
      counts[1]++;
      cochesPorRango["5-10 min"].push(r.IdCoche);
    } else if (diffMin < 60) {
      counts[2]++;
      cochesPorRango["10-60 min"].push(r.IdCoche);
    } else {
      counts[3]++;
      cochesPorRango[">60 min"].push(r.IdCoche);
    }
  });

  const barData = {
    labels: [
      `<5 min (${counts[0]})`,
      `5-10 min (${counts[1]})`,
      `10-60 min (${counts[2]})`,
      `>60 min (${counts[3]})`,
    ],
    datasets: [
      {
        label: "Coches en Riesgo",
        data: counts,
        backgroundColor: "red",
      },
    ],
  };

  const barOptions = {
    responsive: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 5 },
        max: 50,
      },
    },
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h2>Registrar Coche</h2>

      {/* Ubicación primero */}
      <label>
        Ubicación:
        <select
          value={ubicacion}
          onChange={(e) => setUbicacion(e.target.value)}
          style={{ marginLeft: "1rem" }}
        >
          <option value="Salida Por Tango">Salida Por Tango</option>
          <option value="En Tienda">En Tienda</option>
        </select>
      </label>
      <br />
      <br />

      {/* Número de coche después */}
      <label>
        Número de Coche:
        <input
          type="number"
          value={numeroCoche}
          onChange={(e) => setNumeroCoche(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ marginLeft: "1rem" }}
        />
      </label>
      <br />
      <br />

      <button onClick={handleGuardar}>Guardar</button>
      <hr />

      {/* Responsive gráficos */}
      <div className="charts-container">
        {/* Pie */}
        <div style={{ width: "300px" }}>
          <h3>Estado de Coches</h3>
          <Pie data={pieData} />
        </div>

        {/* Barra + detalle + buscar */}
        <div className="charts-subcontainer">
          <div style={{ width: "500px" }}>
            <h3>Coches en Riesgo (Antigüedad)</h3>
            <Bar data={barData} options={barOptions} width={300} height={200} />
          </div>

          <div style={{ width: "250px" }}>
            <h3>Detalle</h3>
            <ul>
              <li>{`<5 min : ${cochesPorRango["<5 min"].join(", ") || "Ninguno"}`}</li>
              <li>{`5-10 min : ${cochesPorRango["5-10 min"].join(", ") || "Ninguno"}`}</li>
              <li>{`10-60 min : ${cochesPorRango["10-60 min"].join(", ") || "Ninguno"}`}</li>
              <li>{`>60 min : ${cochesPorRango[">60 min"].join(", ") || "Ninguno"}`}</li>
            </ul>
          </div>

          {/* Nueva sección buscar coche */}
          <div style={{ width: "250px" }}>
            <h3>Buscar coche</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <input
                type="number"
                value={buscarCoche}
                onChange={(e) => setBuscarCoche(e.target.value)}
                onKeyDown={handleBuscarKeyDown}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
              <button
                onClick={handleBuscar}
                style={{ width: "100%", boxSizing: "border-box" }}
              >
                Buscar
              </button>
            </div>
            <div style={{ marginTop: "1rem" }}>
              {resultadoBusqueda ? (
                <div>
                  <p><b>Coche {resultadoBusqueda.IdCoche}</b></p>
                  <p>{new Date(resultadoBusqueda.FechaHora).toLocaleString()}</p>
                  <p>{resultadoBusqueda.Ubicacion}</p>
                  <p>NCPU: {resultadoBusqueda.NCPU}</p>
                </div>
              ) : (
                buscarCoche && <p>No se encontró registro</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <hr />
      <h3>Log Histórico de Reportes:</h3>
      <ul>
        {reportes.length === 0 && <li>No hay reportes aún</li>}
        {reportes.map((r) => (
          <li key={r.idReporte}>
            {new Date(r.FechaHora).toLocaleString()} - Coche {r.IdCoche} -{" "}
            {r.Ubicacion} - NCPU: {r.NCPU}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
