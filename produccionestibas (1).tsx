import React, { useState, useEffect } from 'react';
import { 
  User, ClipboardList, Clock, CheckCircle, Package, 
  Settings, LogOut, Play, Square, FileText, AlertCircle, BarChart3,
  TrendingUp, Users, Target, Lightbulb, Calendar,
  LogIn, HardHat, Shield, Edit, Trash2, Plus, X, Eye
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  PieChart, Pie, Cell, Legend 
} from 'recharts';

// Constantes de inventario
const WOOD_REFERENCES = [
  'Tabla 120*14*2',
  'Tabla 120*10*2',
  'Tabla 120*11*2',
  'Tabla 100*14*2',
  'Tabla 77*14*2',
  'Taco 14*14*8'
];

const NAIL_REFERENCES = [
  'Grande 3 Pulgadas',
  'Pequeñas 2 (1/4) Pulgadas'
];

const PALLET_TYPES = ['Perimetral', 'Norma'];

export default function App() {
  // Estado Global
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [operators, setOperators] = useState([
    { id: 1, name: 'Carlos Ramírez' },
    { id: 2, name: 'Ana Gómez' }
  ]);
  const [currentRole, setCurrentRole] = useState('Operario'); // 'Operario' | 'Supervisor'
  const [shifts, setShifts] = useState([]); // Historial de turnos
  
  // Estado del Turno Actual (Operario)
  const [activeShift, setActiveShift] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedShiftSummary, setCompletedShiftSummary] = useState(null); // Nuevo estado para el resumen
  
  // Filtro de tiempo para el Supervisor
  const [timeFilter, setTimeFilter] = useState('todos'); // 'diario', 'semanal', 'mensual', 'todos'
  const [supervisorTab, setSupervisorTab] = useState('dashboard'); // 'dashboard' | 'operarios'
  const [editingOperator, setEditingOperator] = useState(null);
  const [newOperatorName, setNewOperatorName] = useState('');
  const [formError, setFormError] = useState(null); // Nuevo estado para errores de validación
  const [selectedShiftAdmin, setSelectedShiftAdmin] = useState(null); // Estado para el modal interactivo del admin

  // Formularios de Turno
  const [operatorName, setOperatorName] = useState('');
  const [palletType, setPalletType] = useState(PALLET_TYPES[0]);
  const [initialWood, setInitialWood] = useState(
    WOOD_REFERENCES.reduce((acc, ref) => ({ ...acc, [ref]: '' }), {})
  );

  const [finalWood, setFinalWood] = useState(
    WOOD_REFERENCES.reduce((acc, ref) => ({ ...acc, [ref]: '' }), {})
  );
  const [nails, setNails] = useState(
    NAIL_REFERENCES.reduce((acc, ref) => ({ ...acc, [ref]: '' }), {})
  );

  // Funciones Operario
  const handleStartShift = (e) => {
    e.preventDefault();
    if (!operatorName) return;
    
    const newShift = {
      id: Date.now(),
      operatorName,
      palletType,
      startTime: new Date(),
      initialWood: { ...initialWood },
      status: 'active'
    };
    
    setActiveShift(newShift);
    setFinalWood(WOOD_REFERENCES.reduce((acc, ref) => ({ ...acc, [ref]: '' }), {}));
    setNails(NAIL_REFERENCES.reduce((acc, ref) => ({ ...acc, [ref]: '' }), {}));
  };

  const handleEndShift = (e) => {
    e.preventDefault();

    // 1. Validar que el inventario final NO sea mayor al inicial
    for (const ref of WOOD_REFERENCES) {
      const initial = parseInt(activeShift.initialWood[ref] || 0, 10);
      const final = parseInt(finalWood[ref] || 0, 10);
      
      if (final > initial) {
        setFormError(`El inventario final de "${ref}" (${final} unds) no puede ser superior al inventario inicial (${initial} unds). Por favor, corrija el valor.`);
        return; // Detiene el guardado y arroja la alerta
      }
    }
    
    // Calcular consumos
    const woodConsumption = {};
    WOOD_REFERENCES.forEach(ref => {
      const initial = parseFloat(activeShift.initialWood[ref]) || 0;
      const final = parseFloat(finalWood[ref]) || 0;
      woodConsumption[ref] = initial - final; // Diferencia
    });

    const completedShift = {
      ...activeShift,
      endTime: new Date(),
      finalWood: { ...finalWood },
      woodConsumption,
      nailsConsumption: { ...nails },
      status: 'completed'
    };

    setShifts([completedShift, ...shifts]);
    setCompletedShiftSummary(completedShift); // Guardamos los datos para mostrar el resumen
    setShowSuccessModal(true); // Mostrar modal de éxito
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setActiveShift(null);
    setCompletedShiftSummary(null);
    
    // Reset forms (No reseteamos el nombre del operario porque sigue logueado)
    setInitialWood(WOOD_REFERENCES.reduce((acc, ref) => ({ ...acc, [ref]: '' }), {}));
  };

  // Funciones Supervisor (CRUD Operarios)
  const handleSaveOperator = (e) => {
    e.preventDefault();
    if (!newOperatorName.trim()) return;
    
    if (editingOperator) {
      setOperators(operators.map(op => op.id === editingOperator.id ? { ...op, name: newOperatorName } : op));
      setEditingOperator(null);
    } else {
      setOperators([...operators, { id: Date.now(), name: newOperatorName }]);
    }
    setNewOperatorName('');
  };

  const handleDeleteOperator = (id) => {
    setOperators(operators.filter(op => op.id !== id));
  };

  // Utilidad para calcular el tiempo trabajado
  const formatDuration = (start, end) => {
    const diffMs = new Date(end) - new Date(start);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.round((diffMs % 3600000) / 60000);
    return `${diffHrs}h ${diffMins}m`;
  };

  // Vistas
  const renderOperario = () => {
    if (activeShift) {
      return (
        <div className="max-w-3xl mx-auto animate-fade-in">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Play className="w-5 h-5 fill-current" /> Turno en Progreso
                </h2>
                <p className="text-emerald-100 text-sm mt-1">
                  Iniciado: {activeShift.startTime.toLocaleTimeString()} | Operario: {activeShift.operatorName} | Estiba: {activeShift.palletType}
                </p>
              </div>
              <Clock className="w-8 h-8 opacity-80 animate-pulse" />
            </div>

            <form onSubmit={handleEndShift} className="p-6 space-y-8">
              {/* Inventario Final */}
              <section>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" /> 
                  1. Registrar Inventario Final (Madera)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {WOOD_REFERENCES.map(ref => (
                    <div key={ref} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-slate-700">{ref}</label>
                        <span className="text-xs text-slate-500">Inicial: {activeShift.initialWood[ref] || 0}</span>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        className="w-24 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-right font-medium"
                        placeholder="0"
                        value={finalWood[ref]}
                        onChange={(e) => setFinalWood({...finalWood, [ref]: e.target.value.replace(/\D/g, '')})}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Consumo de Clavos */}
              <section>
                <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" /> 
                  2. Consumo de Clavos (Cananas)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {NAIL_REFERENCES.map(ref => (
                    <div key={ref} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">{ref}</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        className="w-24 p-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-right font-medium"
                        placeholder="0"
                        value={nails[ref]}
                        onChange={(e) => setNails({...nails, [ref]: e.target.value.replace(/\D/g, '')})}
                      />
                    </div>
                  ))}
                </div>
              </section>

              <button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-6 rounded-lg flex justify-center items-center gap-2 transition-colors shadow-md"
              >
                <Square className="w-5 h-5 fill-current" />
                Finalizar Turno y Calcular
              </button>
            </form>

            {/* Modal de Alerta/Error (No usar window.alert por normativa) */}
            {formError && (
              <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full animate-fade-in text-center relative border-t-8 border-red-500">
                  <button onClick={() => setFormError(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Inconsistencia de Datos</h3>
                  <p className="text-slate-600 mb-6 font-medium text-sm leading-relaxed">{formError}</p>
                  <button
                    onClick={() => setFormError(null)}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md"
                  >
                    Entendido, voy a corregirlo
                  </button>
                </div>
              </div>
            )}

            {/* Modal de Éxito y Resumen Detallado */}
            {showSuccessModal && completedShiftSummary && (
              <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">¡Turno Finalizado!</h2>
                    <p className="text-lg font-medium text-emerald-600 italic mt-2">
                      "El esfuerzo de hoy es el éxito de mañana"
                    </p>
                  </div>

                  {/* Tabla de Resumen de Producción */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 text-left">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
                      <ClipboardList className="w-5 h-5 text-slate-500" /> Resumen de Producción
                    </h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5 text-sm">
                      <div>
                        <span className="block text-slate-500 text-xs uppercase tracking-wider">Operario</span>
                        <span className="font-bold text-slate-800 text-base">{completedShiftSummary.operatorName}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500 text-xs uppercase tracking-wider">Fecha</span>
                        <span className="font-bold text-slate-800 text-base">{new Date(completedShiftSummary.endTime).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500 text-xs uppercase tracking-wider">Ref. Estiba</span>
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-bold mt-1">
                          {completedShiftSummary.palletType}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                          <Package className="w-4 h-4 text-emerald-600" /> Consumo de Madera (Tablas/Tacos)
                        </h4>
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="w-full text-left text-sm border-collapse bg-white">
                            <thead className="bg-slate-100 text-slate-600">
                              <tr>
                                <th className="p-3 font-semibold">Referencia</th>
                                <th className="p-3 font-semibold text-center border-l border-slate-200">Inv. Inicial</th>
                                <th className="p-3 font-semibold text-center border-l border-slate-200">Inv. Final</th>
                                <th className="p-3 font-bold text-right text-emerald-700 bg-emerald-50 border-l border-slate-200">Consumo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {WOOD_REFERENCES.map(ref => (
                                <tr key={ref} className="hover:bg-slate-50">
                                  <td className="p-3 text-slate-700 font-medium">{ref}</td>
                                  <td className="p-3 text-center text-slate-600 border-l border-slate-100">{completedShiftSummary.initialWood[ref] || 0}</td>
                                  <td className="p-3 text-center text-slate-600 border-l border-slate-100">{completedShiftSummary.finalWood[ref] || 0}</td>
                                  <td className="p-3 text-right font-black text-emerald-600 bg-emerald-50/30 border-l border-emerald-100">
                                    {completedShiftSummary.woodConsumption[ref] || 0}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-amber-600" /> Consumo de Clavos
                        </h4>
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="w-full text-left text-sm border-collapse bg-white">
                            <thead className="bg-slate-100 text-slate-600">
                              <tr>
                                <th className="p-3 font-semibold">Referencia Canana</th>
                                <th className="p-3 font-bold text-right text-amber-700 bg-amber-50 border-l border-slate-200">Consumo Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {NAIL_REFERENCES.map(ref => (
                                <tr key={ref} className="hover:bg-slate-50">
                                  <td className="p-3 text-slate-700 font-medium">{ref}</td>
                                  <td className="p-3 text-right font-black text-amber-600 bg-amber-50/30 border-l border-amber-100">
                                    {completedShiftSummary.nailsConsumption[ref] || 0}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={closeSuccessModal}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-6 rounded-lg transition-colors shadow-md mt-2"
                  >
                    Cerrar Resumen y Continuar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Formulario Iniciar Turno
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-slate-800 p-4 text-white">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <User className="w-5 h-5" /> Iniciar Nuevo Turno
            </h2>
          </div>

          <form onSubmit={handleStartShift} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nombre del Operario</label>
                <input
                  type="text"
                  readOnly
                  className="w-full p-3 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 outline-none font-medium cursor-not-allowed"
                  value={operatorName}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Fecha del Turno (Automática)</label>
                <input
                  type="text"
                  readOnly
                  className="w-full p-3 bg-slate-100 border border-slate-300 rounded-lg text-slate-500 outline-none font-semibold cursor-not-allowed text-center"
                  value={new Date().toLocaleDateString()}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Referencia de Estiba</label>
              <div className="flex gap-3">
                {PALLET_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPalletType(type)}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold border-2 transition-all ${
                      palletType === type 
                        ? 'bg-slate-800 border-slate-800 text-white shadow-md' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <section className="mt-8">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Por favor, realice el conteo de madera en su estación antes de comenzar la producción. Ingrese las cantidades exactas en la tabla.
                </p>
              </div>

              <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-slate-600" /> 
                Inventario Inicial (Madera)
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {WOOD_REFERENCES.map(ref => (
                  <div key={ref} className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">{ref}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none text-right font-medium"
                      placeholder="0"
                      value={initialWood[ref]}
                      onChange={(e) => setInitialWood({...initialWood, [ref]: e.target.value.replace(/\D/g, '')})}
                    />
                  </div>
                ))}
              </div>
            </section>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-lg flex justify-center items-center gap-2 transition-colors shadow-md mt-6"
            >
              <Play className="w-5 h-5 fill-current" />
              Iniciar Turno Ahora
            </button>
          </form>
        </div>
      </div>
    );
  };

  const renderSupervisor = () => {
    // Vista de Gestión de Operarios (CRUD)
    if (supervisorTab === 'operarios') {
      return (
        <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Users className="w-6 h-6 text-blue-600" />
              <span className="text-lg">Gestión de Personal Operativo</span>
            </div>
            <button
              onClick={() => setSupervisorTab('dashboard')}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-bold flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" /> Volver al Panel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 pb-3 border-b">
                {editingOperator ? <Edit className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-emerald-500" />}
                {editingOperator ? 'Modificar Operario' : 'Registrar Nuevo'}
              </h3>
              <form onSubmit={handleSaveOperator} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ej. Juan Pérez"
                    value={newOperatorName}
                    onChange={(e) => setNewOperatorName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg transition-colors text-sm"
                  >
                    {editingOperator ? 'Guardar Cambios' : 'Crear Perfil'}
                  </button>
                  {editingOperator && (
                    <button
                      type="button"
                      onClick={() => { setEditingOperator(null); setNewOperatorName(''); }}
                      className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors text-sm"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                    <th className="p-4 font-semibold w-24">ID</th>
                    <th className="p-4 font-semibold">Nombre del Operario</th>
                    <th className="p-4 font-semibold text-right">Opciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {operators.length === 0 ? (
                    <tr><td colSpan="3" className="p-8 text-center text-slate-500">No hay personal registrado.</td></tr>
                  ) : (
                    operators.map(op => (
                      <tr key={op.id} className="hover:bg-slate-50">
                        <td className="p-4 text-sm text-slate-400 font-mono">#{op.id.toString().slice(-4)}</td>
                        <td className="p-4 font-bold text-slate-800 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex justify-center items-center text-xs">
                            {op.name.charAt(0).toUpperCase()}
                          </div>
                          {op.name}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => { setEditingOperator(op); setNewOperatorName(op.name); }}
                              className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Modificar"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteOperator(op.id)}
                              className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    const filteredShifts = shifts.filter(shift => {
      if (shift.status !== 'completed') return false;
      const shiftDate = new Date(shift.startTime);
      const now = new Date();
      
      if (timeFilter === 'diario') {
        return shiftDate.toDateString() === now.toDateString();
      }
      if (timeFilter === 'semanal') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return shiftDate >= weekAgo;
      }
      if (timeFilter === 'mensual') {
        return shiftDate.getMonth() === now.getMonth() && shiftDate.getFullYear() === now.getFullYear();
      }
      return true; // 'todos'
    });

    let totalWoodConsumed = 0;
    let totalNailsConsumed = 0;
    const operatorStats = {};

    filteredShifts.forEach(shift => {
      if (!operatorStats[shift.operatorName]) {
        operatorStats[shift.operatorName] = { turnos: 0, madera: 0, clavos: 0 };
      }
      operatorStats[shift.operatorName].turnos += 1;

      Object.values(shift.woodConsumption).forEach(val => {
        const amount = parseFloat(val) || 0;
        totalWoodConsumed += amount;
        operatorStats[shift.operatorName].madera += amount;
      });
      
      Object.values(shift.nailsConsumption).forEach(val => {
        const amount = parseFloat(val) || 0;
        totalNailsConsumed += amount;
        operatorStats[shift.operatorName].clavos += amount;
      });
    });

    const activeOperators = Object.keys(operatorStats).length;

    // --- NUEVO CODIGO: PREPARAR DATOS PARA GRAFICAS ---
    const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'];
    
    const woodChartData = WOOD_REFERENCES.map(ref => ({
      name: ref.replace('Tabla ', '').replace('Taco ', ''),
      Consumo: filteredShifts.reduce((acc, shift) => acc + (parseInt(shift.woodConsumption[ref], 10) || 0), 0)
    }));

    const operatorChartData = Object.entries(operatorStats).map(([name, stats]) => ({
      name: name.split(' ')[0] + ' ' + (name.split(' ')[1]?.charAt(0) || '') + '.',
      Turnos: stats.turnos,
      Madera: stats.madera,
      Clavos: stats.clavos
    }));
    // --------------------------------------------------

    return (
      <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Panel de Control y Proyecciones</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setSupervisorTab('operarios')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-bold border border-blue-200"
            >
              <Settings className="w-4 h-4" /> Administrar Operarios
            </button>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {['diario', 'semanal', 'mensual', 'todos'].map(period => (
                <button
                  key={period}
                  onClick={() => setTimeFilter(period)}
                  className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                    timeFilter === period 
                      ? 'bg-white text-blue-700 shadow-sm border border-slate-200' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- NUEVO MODULO: GRAFICAS ESTADISTICAS --- */}
        {filteredShifts.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 mb-6">
            {/* Gráfica 1: Consumo de Madera */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" /> Consumo de Madera por Referencia
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={woodChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b'}} interval={0} angle={-45} textAnchor="end" height={60} />
                    <YAxis tick={{fontSize: 12, fill: '#64748b'}} />
                    <RechartsTooltip 
                      cursor={{fill: '#f1f5f9'}}
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Bar dataKey="Consumo" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfica 2: Productividad/Turnos por Operario */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-2">
                <Users className="w-5 h-5 text-blue-600" /> Distribución de Turnos por Operario
              </h3>
              <div className="h-64 w-full flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={operatorChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="Turnos"
                    >
                      {operatorChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                       contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        {/* ------------------------------------------- */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-500" /> Rendimiento por Operario
              </h3>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="pb-3 font-semibold">Operario</th>
                    <th className="pb-3 font-semibold text-center">Turnos Realizados</th>
                    <th className="pb-3 font-semibold text-right">Madera Promedio/Turno</th>
                    <th className="pb-3 font-semibold text-right">Clavos Promedio/Turno</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(operatorStats).length === 0 ? (
                    <tr><td colSpan="4" className="py-4 text-center text-sm text-slate-500">No hay datos en este periodo</td></tr>
                  ) : (
                    Object.entries(operatorStats).map(([name, stats]) => (
                      <tr key={name} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 font-medium text-slate-800 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          {name}
                        </td>
                        <td className="py-3 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {stats.turnos} turnos
                          </span>
                        </td>
                        <td className="py-3 text-right text-sm text-slate-600 font-medium">
                          {(stats.madera / stats.turnos).toFixed(1)} unds
                        </td>
                        <td className="py-3 text-right text-sm text-slate-600 font-medium">
                          {(stats.clavos / stats.turnos).toFixed(1)} cnn
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 text-white overflow-hidden flex flex-col">
            <div className="bg-slate-900 p-4 border-b border-slate-700">
              <h3 className="font-bold flex items-center gap-2 text-amber-400">
                <Lightbulb className="w-5 h-5" /> Análisis y Decisiones
              </h3>
            </div>
            <div className="p-5 flex-1 space-y-4">
              {filteredShifts.length === 0 ? (
                <p className="text-slate-400 text-sm">No hay suficientes datos para generar proyecciones en este periodo.</p>
              ) : (
                <>
                  <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                    <p className="text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wider">Proyección de Insumos</p>
                    <p className="text-sm">
                      Al ritmo actual, el consumo estimado para los próximos 7 días es de <strong className="text-emerald-400">{(totalWoodConsumed * (timeFilter === 'diario' ? 7 : 1)).toFixed(0)} maderas</strong> y <strong className="text-amber-400">{(totalNailsConsumed * (timeFilter === 'diario' ? 7 : 1)).toFixed(0)} cananas de clavos</strong>. Solicite inventario con anticipación.
                    </p>
                  </div>

                  {activeOperators > 0 && (
                    <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                      <p className="text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wider">Control de Productividad</p>
                      <p className="text-sm">
                        El promedio de consumo de madera por turno es de <strong className="text-blue-300">{(totalWoodConsumed / filteredShifts.length).toFixed(1)} unds</strong>. Verifique operaciones que superen este umbral para evitar desperdicio.
                      </p>
                    </div>
                  )}

                  <button className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors flex justify-center items-center gap-2">
                    <FileText className="w-4 h-4" /> Exportar Informe Completo
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-slate-500" /> Registro Detallado de Turnos
            </h2>
          </div>

          {filteredShifts.length === 0 ? (
             <div className="p-12 text-center text-slate-500 flex flex-col items-center">
               <FileText className="w-12 h-12 mb-3 text-slate-300" />
               <p className="text-lg">No hay turnos finalizados en el periodo seleccionado.</p>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                    <th className="p-4 font-semibold text-sm">Fecha</th>
                    <th className="p-4 font-semibold text-sm">Operario</th>
                    <th className="p-4 font-semibold text-sm">Referencia</th>
                    <th className="p-4 font-semibold text-sm">Tiempo / Duración</th>
                    <th className="p-4 font-semibold text-sm bg-blue-50 border-l border-blue-100">Consumo Madera (Por Ref.)</th>
                    <th className="p-4 font-semibold text-sm bg-amber-50 border-l border-amber-100">Consumo Clavos</th>
                    <th className="p-4 font-semibold text-sm text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredShifts.map((shift) => (
                    <tr key={shift.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-sm text-slate-600 whitespace-nowrap">
                        {new Date(shift.startTime).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-medium text-slate-800">
                        {shift.operatorName}
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-semibold shadow-sm">
                          {shift.palletType}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        <div><span className="font-medium">Ini:</span> {new Date(shift.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        <div><span className="font-medium">Fin:</span> {new Date(shift.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        <div className="mt-1 pt-1 border-t border-slate-200 text-indigo-600 font-bold text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDuration(shift.startTime, shift.endTime)}
                        </div>
                      </td>
                      <td className="p-4 bg-blue-50/30 border-l border-blue-100">
                        <div className="flex flex-wrap gap-1.5">
                          {WOOD_REFERENCES.map(ref => {
                            const val = shift.woodConsumption[ref];
                            if (val !== 0 && val !== '0' && val !== '' && val !== undefined) {
                              return (
                                <span key={ref} className="inline-flex items-center px-2 py-1 rounded bg-white text-blue-800 text-xs font-semibold border border-blue-200 shadow-sm" title={ref}>
                                  {ref.replace('Tabla ', 'T.').replace('Taco ', 'Tc.')}: <span className="ml-1 text-blue-600">{val}</span>
                                </span>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </td>
                      <td className="p-4 bg-amber-50/30 border-l border-amber-100">
                        <div className="space-y-1 text-xs">
                          {NAIL_REFERENCES.map(ref => {
                            const val = shift.nailsConsumption[ref];
                            if (val !== 0 && val !== '0' && val !== '' && val !== undefined) {
                              return (
                                <div key={ref} className="flex justify-between items-center bg-white px-2 py-1 border border-amber-200 rounded shadow-sm">
                                  <span className="text-slate-600 truncate w-20" title={ref}>{ref.split(' ')[0]}</span>
                                  <span className="font-bold text-amber-700">{val}</span>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedShiftAdmin(shift)}
                          className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors inline-flex items-center justify-center shadow-sm"
                          title="Ver Detalle Completo"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Interactivo: Detalle del Turno para el Supervisor */}
        {selectedShiftAdmin && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in relative border-t-8 border-indigo-500">
              <button 
                onClick={() => setSelectedShiftAdmin(null)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 transition-colors bg-slate-100 hover:bg-slate-200 rounded-full p-1"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-6 border-b pb-4">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <ClipboardList className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Detalle Exacto del Turno</h2>
                  <p className="text-sm text-slate-500">
                    Inspección del registro generado por <span className="font-bold text-indigo-600">{selectedShiftAdmin.operatorName}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="block text-xs text-slate-500 uppercase font-bold">Fecha</span>
                  <span className="text-sm font-semibold text-slate-800">{new Date(selectedShiftAdmin.endTime).toLocaleDateString()}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="block text-xs text-slate-500 uppercase font-bold">Estiba</span>
                  <span className="text-sm font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">{selectedShiftAdmin.palletType}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 col-span-2 flex justify-between items-center">
                  <div>
                    <span className="block text-xs text-slate-500 uppercase font-bold">Horario</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {new Date(selectedShiftAdmin.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(selectedShiftAdmin.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs text-slate-500 uppercase font-bold">Tiempo T.</span>
                    <span className="text-sm font-black text-indigo-600">{formatDuration(selectedShiftAdmin.startTime, selectedShiftAdmin.endTime)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-600" /> Auditoría de Madera
                  </h4>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
                    <table className="w-full text-left text-sm border-collapse bg-white">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="p-3 font-semibold">Referencia</th>
                          <th className="p-3 font-semibold text-center border-l border-slate-200">Inv. Inicial</th>
                          <th className="p-3 font-semibold text-center border-l border-slate-200">Inv. Final</th>
                          <th className="p-3 font-bold text-right text-emerald-700 bg-emerald-50 border-l border-emerald-200">Consumo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {WOOD_REFERENCES.map(ref => {
                          const initial = selectedShiftAdmin.initialWood[ref] || 0;
                          const final = selectedShiftAdmin.finalWood[ref] || 0;
                          const consumed = selectedShiftAdmin.woodConsumption[ref] || 0;
                          
                          if (initial == 0 && final == 0 && consumed == 0) return null; // Ocultar los que no se usaron para limpiar la vista

                          return (
                            <tr key={ref} className="hover:bg-slate-50">
                              <td className="p-3 text-slate-700 font-medium">{ref}</td>
                              <td className="p-3 text-center text-slate-600 border-l border-slate-100">{initial}</td>
                              <td className="p-3 text-center text-slate-600 border-l border-slate-100">{final}</td>
                              <td className="p-3 text-right font-black text-emerald-600 bg-emerald-50/30 border-l border-emerald-100">
                                {consumed}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600" /> Auditoría de Clavos
                  </h4>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
                    <table className="w-full text-left text-sm border-collapse bg-white">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="p-3 font-semibold">Referencia Canana</th>
                          <th className="p-3 font-bold text-right text-amber-700 bg-amber-50 border-l border-amber-200">Consumo Registrado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {NAIL_REFERENCES.map(ref => {
                          const consumed = selectedShiftAdmin.nailsConsumption[ref] || 0;
                          if (consumed == 0) return null;

                          return (
                            <tr key={ref} className="hover:bg-slate-50">
                              <td className="p-3 text-slate-700 font-medium">{ref}</td>
                              <td className="p-3 text-right font-black text-amber-600 bg-amber-50/30 border-l border-amber-100">
                                {consumed}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-10 animate-fade-in">
            <div className="inline-flex bg-emerald-500 p-4 rounded-2xl mb-4 shadow-lg shadow-emerald-500/20">
              <Package className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">CRM Estibas Madereras</h1>
            <p className="text-slate-400 mt-3 text-lg">Seleccione su perfil para ingresar al sistema</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 hover:border-emerald-500 transition-all group shadow-xl">
              <div className="w-16 h-16 bg-slate-700 group-hover:bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6 transition-colors">
                <HardHat className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Ingreso Operario</h2>
              <p className="text-slate-400 mb-6 text-sm">Registra tu turno, inventarios y consumos diarios.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Selecciona tu perfil</label>
                  <select 
                    className="w-full p-4 bg-slate-900 border border-slate-600 rounded-lg text-white outline-none focus:border-emerald-500 font-medium"
                    onChange={(e) => setOperatorName(e.target.value)}
                    value={operatorName}
                  >
                    <option value="">-- Buscar mi nombre --</option>
                    {operators.map(op => (
                      <option key={op.id} value={op.name}>{op.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  disabled={!operatorName}
                  onClick={() => {
                    setCurrentRole('Operario');
                    setIsLoggedIn(true);
                  }}
                  className={`w-full font-bold py-4 px-4 rounded-lg flex justify-center items-center gap-2 transition-colors ${
                    operatorName 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30' 
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <LogIn className="w-5 h-5" /> Entrar a Planta
                </button>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 hover:border-blue-500 transition-all group shadow-xl flex flex-col">
              <div className="w-16 h-16 bg-slate-700 group-hover:bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 transition-colors">
                <Shield className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Ingreso Supervisor</h2>
              <p className="text-slate-400 mb-6 text-sm">Control total, gestión de personal, análisis e informes de producción.</p>
              
              <div className="mt-auto pt-6">
                <button
                  onClick={() => {
                    setCurrentRole('Supervisor');
                    setIsLoggedIn(true);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-4 rounded-lg flex justify-center items-center gap-2 transition-colors shadow-lg shadow-blue-600/30"
                >
                  <Settings className="w-5 h-5" /> Entrar a Administración
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      <nav className="bg-slate-900 text-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-2 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight hidden sm:block">CRM Estibas Madereras</h1>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-6">
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{currentRole}</p>
                <p className="text-sm font-bold">{currentRole === 'Operario' ? operatorName : 'Administrador'}</p>
              </div>
              <div className="h-8 w-px bg-slate-700 hidden sm:block"></div>
              <button
                onClick={() => {
                  setIsLoggedIn(false);
                  setActiveShift(null);
                  setOperatorName('');
                  setSupervisorTab('dashboard');
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-slate-800 text-slate-300 hover:text-white hover:bg-red-500 transition-colors border border-slate-700 hover:border-red-500"
              >
                <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="p-4 sm:p-6 lg:p-8">
        {currentRole === 'Operario' ? renderOperario() : renderSupervisor()}
      </main>
    </div>
  );
}