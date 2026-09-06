import { useState, useEffect } from 'react';
import { bugsApi, testsApi, coverageApi } from '../services/api';
import { Bug, TestCase, CoverageAnalysis } from '../types';

export default function EpicsPage() {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [tests, setTests] = useState<TestCase[]>([]);
  const [coverage, setCoverage] = useState<CoverageAnalysis[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [b, t, c] = await Promise.all([bugsApi.getAll(), testsApi.getAll(), coverageApi.getAll()]);
      setBugs(b.bugs || []);
      setTests(t.tests || []);
      setCoverage(c.coverage || []);
    } finally { setLoading(false); }
  };

  const openBugs = bugs.filter(b => b.status === 'OPEN').length;
  const activeTests = tests.filter(t => t.status === 'ACTIVE').length;
  const avgCoverage = coverage.length > 0 ? Math.round(coverage.reduce((s, c) => s + c.overallCoverage, 0) / coverage.length) : 0;

  const epics = [
    { id: 'e1', name: 'Sistema de Autenticacion', desc: 'Login, registro y 2FA', status: 'in_progress', progress: 65, stories: '5/8', bugs: Math.ceil(openBugs * 0.4), tests: Math.ceil(activeTests * 0.3), cov: avgCoverage > 0 ? Math.min(100, avgCoverage + 10) : 0 },
    { id: 'e2', name: 'Modulo de Pagos', desc: 'Checkout y facturacion', status: 'planning', progress: 20, stories: '2/12', bugs: Math.ceil(openBugs * 0.3), tests: Math.ceil(activeTests * 0.4), cov: avgCoverage > 0 ? Math.max(0, avgCoverage - 15) : 0 },
    { id: 'e3', name: 'Dashboard Usuario', desc: 'Panel principal y perfil', status: 'in_progress', progress: 45, stories: '3/6', bugs: Math.ceil(openBugs * 0.2), tests: Math.ceil(activeTests * 0.2), cov: avgCoverage },
  ];

  if (loading) return <div className='card'><p>Cargando epicas...</p></div>;

  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-bold'>Epic Tracking</h1>
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <div className='card'><p className='text-sm text-gray-500'>Total</p><p className='text-3xl font-bold'>{epics.length}</p></div>
        <div className='card'><p className='text-sm text-gray-500'>En Progreso</p><p className='text-3xl font-bold text-blue-600'>{epics.filter(e => e.status === 'in_progress').length}</p></div>
        <div className='card'><p className='text-sm text-gray-500'>Bugs</p><p className='text-3xl font-bold text-red-600'>{openBugs}</p></div>
        <div className='card'><p className='text-sm text-gray-500'>Tests</p><p className='text-3xl font-bold text-green-600'>{activeTests}</p></div>
      </div>
      {epics.map(epic => (
        <div key={epic.id} className='card'>
          <div className='flex items-center gap-3 mb-3'>
            <h3 className='text-lg font-semibold'>{epic.name}</h3>
            <span className='text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800'>{epic.status.replace('_', ' ')}</span>
          </div>
          <p className='text-sm text-gray-600 mb-3'>{epic.desc}</p>
          <div className='w-full bg-gray-200 rounded-full h-3 mb-3'>
            <div className='h-3 rounded-full bg-blue-500' style={{ width: epic.progress + '%' }}></div>
          </div>
          <div className='grid grid-cols-4 gap-4 text-sm'>
            <div><p className='text-gray-500'>Historias</p><p>{epic.stories}</p></div>
            <div><p className='text-gray-500'>Bugs</p><p className='text-red-600'>{epic.bugs}</p></div>
            <div><p className='text-gray-500'>Tests</p><p className='text-blue-600'>{epic.tests}</p></div>
            <div><p className='text-gray-500'>Coverage</p><p>{epic.cov}%</p></div>
          </div>
        </div>
      ))}
    </div>
  );
}
