import {
  buildDorFixPreview,
  buildDorSyncRecommendation,
  parseDorFixRequest,
} from '../../services/dorFixes';

const story = {
  title: 'Título de una HDU válida',
  description: 'Como usuario, quiero completar una acción, para obtener un resultado verificable.',
  acceptanceCriteria: ['El sistema debe mostrar el resultado esperado'],
  priority: 'MEDIUM',
  storyPoints: null,
  updatedAt: '2026-09-29T09:00:00.000Z',
  technicalNotes: [],
  externalSystem: 'GITHUB',
  externalId: '63',
  syncStatus: 'UNSYNCED',
  staticAnalysis: null,
};

describe('DoR fixes contract', () => {
  it('normaliza y valida los tipos permitidos', () => {
    const request = parseDorFixRequest({
      fixes: [
        { field: 'priority', value: 'high' },
        { field: 'storyPoints', value: 5 },
      ],
    });

    expect(request.fixes).toEqual([
      { field: 'priority', value: 'HIGH' },
      { field: 'storyPoints', value: 5 },
    ]);
  });

  it('rejects values that cannot be applied safely', () => {
    expect(() => parseDorFixRequest({ fixes: [{ field: 'storyPoints', value: 4 }] })).toThrow(/Fibonacci/);
    expect(() => parseDorFixRequest({ fixes: [{ field: 'priority', value: 'URGENT' }] })).toThrow(/HIGH/);
  });

  it('detects incompatible proposals for the same field', () => {
    const preview = buildDorFixPreview(story, parseDorFixRequest({
      fixes: [
        { field: 'priority', value: 'HIGH' },
        { field: 'priority', value: 'LOW' },
      ],
    }));

    expect(preview.conflicts).toHaveLength(1);
    expect(preview.changes).toHaveLength(0);
  });

  it('preserves existing acceptance criteria when adding a proposed criterion', () => {
    const preview = buildDorFixPreview(story, parseDorFixRequest({
      fixes: [{ field: 'acceptanceCriteria', value: ['El sistema debe permitir reintentar'] }],
    }));

    expect(preview.changes[0].proposedValue).toEqual([
      'El sistema debe mostrar el resultado esperado',
      'El sistema debe permitir reintentar',
    ]);
  });

  it('recommends a confirmed GitHub push only for linked unsynced stories', () => {
    expect(buildDorSyncRecommendation(story, { repository: 'org/repo' })).toMatchObject({
      action: 'SYNC',
      pendingChanges: true,
      issueNumber: '63',
    });
    expect(buildDorSyncRecommendation({
      ...story,
      externalSystem: null,
      externalId: null,
      syncStatus: 'UNSYNCED',
    }, { repository: 'org/repo' }).action).toBe('CONFIGURE');
  });
});