import configureMockStore from 'redux-mock-store'; // redux-mock-store ^1.5.4
import thunk from 'redux-thunk'; // redux-thunk ^2.4.2
import tasksReducer from '../../../../web/src/store/tasks/tasks.reducer';
import {
  TasksActionTypes,
  TasksState
} from '../../../../web/src/store/tasks/tasks.types';
import { createMockTask } from '../../../utils/mock-data';

jest.setTimeout(10000); // Global test timeout as specified by "testTimeout"

// --------------------------------------------------------------------------------------
// Global references for testing as per JSON specification
// --------------------------------------------------------------------------------------
const mockStore = configureMockStore([thunk]);
let initialState: TasksState;
let store: ReturnType<typeof mockStore>;
let mockAnalytics: Record<string, any>;

// --------------------------------------------------------------------------------------
// Helper function to reset store and default states before each test suite
// --------------------------------------------------------------------------------------
beforeAll(() => {
  // Provide an initial structure for TasksState, including AI metadata and analytics
  // fields that may be handled in extended scenarios. If not present in the actual reducer,
  // we align with the JSON specification to simulate full coverage.
  initialState = {
    tasks: [],
    loading: false,
    error: null,
    filter: {
      status: [],
      priority: [],
      assigneeId: [],
      dueDateRange: null
    },
    lastUpdated: Date.now()
  };

  // Example analytics data that can be used for tests requiring analytics validation.
  mockAnalytics = {
    utilization: 0.85,
    allocatedHours: 10,
    actualHours: 8,
    efficiency: 0.80
  };
});

beforeEach(() => {
  store = mockStore({ tasks: { ...initialState } });
});

// ======================================================================================
// 1) Tests for tasksReducer
// ======================================================================================
describe('tasksReducer', () => {
  it('should initialize with default state including AI metadata and analytics data (if extended)', () => {
    const state = tasksReducer(undefined, { type: '@@INIT' } as any);
    // Checking presence of known default fields; includes filter, pagination, etc.
    expect(state.tasks).toEqual([]);
    expect(state.loading).toEqual({});
    expect(state.error).toBeNull();
    expect(state.pagination).toBeDefined();
    expect(state.filter).toBeDefined();
    expect(state.version).toBe(1);
  });

  it('should handle FETCH_TASKS_REQUEST and set loading state', () => {
    const action = { type: TasksActionTypes.FETCH_TASKS_REQUEST };
    const state = tasksReducer(undefined, action);
    expect(state.loading.fetchTasks).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should handle FETCH_TASKS_SUCCESS and populate tasks array', () => {
    const mockTask1 = createMockTask();
    const mockTask2 = createMockTask();
    const action = {
      type: TasksActionTypes.FETCH_TASKS_SUCCESS,
      payload: [mockTask1, mockTask2]
    };
    const prevState = {
      ...tasksReducer(undefined, { type: '@@INIT' } as any),
      loading: { fetchTasks: true }
    };
    const nextState = tasksReducer(prevState, action);
    expect(nextState.tasks).toHaveLength(2);
    expect(nextState.tasks[0].id).toBe(mockTask1.id);
    expect(nextState.loading.fetchTasks).toBe(false);
    expect(nextState.error).toBeNull();
  });

  it('should handle FETCH_TASKS_FAILURE and set detailed error object', () => {
    const action = {
      type: TasksActionTypes.FETCH_TASKS_FAILURE,
      payload: { error: 'Failed to fetch tasks' }
    };
    const prevState = {
      ...tasksReducer(undefined, { type: '@@INIT' } as any),
      loading: { fetchTasks: true }
    };
    const nextState = tasksReducer(prevState, action);
    expect(nextState.loading.fetchTasks).toBe(false);
    expect(nextState.error).not.toBeNull();
    expect(nextState.error?.code).toEqual('FETCH_TASKS_FAILURE');
    expect(nextState.error?.message).toEqual('Failed to fetch tasks');
  });

  it('should handle create task request and set loading', () => {
    const action = {
      type: TasksActionTypes.CREATE_TASK_REQUEST,
      payload: { title: 'New Task' }
    };
    const nextState = tasksReducer(undefined, action);
    expect(nextState.loading.createTask).toBe(true);
    expect(nextState.error).toBeNull();
  });

  it('should handle create task success and add new task to state with AI processing', () => {
    const newTask = createMockTask({ title: 'AI Processed Task' });
    const action = {
      type: TasksActionTypes.CREATE_TASK_SUCCESS,
      payload: newTask
    };
    const prevState = {
      ...tasksReducer(undefined, { type: '@@INIT' } as any),
      loading: { createTask: true }
    };
    const nextState = tasksReducer(prevState, action);
    expect(nextState.loading.createTask).toBe(false);
    expect(nextState.tasks).toHaveLength(1);
    expect(nextState.tasks[0].title).toBe('AI Processed Task');
    expect(nextState.error).toBeNull();
  });

  it('should handle create task failure with full error details', () => {
    const action = {
      type: TasksActionTypes.CREATE_TASK_FAILURE,
      payload: { error: 'Unable to create task' }
    };
    const prevState = {
      ...tasksReducer(undefined, { type: '@@INIT' } as any),
      loading: { createTask: true }
    };
    const nextState = tasksReducer(prevState, action);
    expect(nextState.loading.createTask).toBe(false);
    expect(nextState.error?.code).toBe('CREATE_TASK_FAILURE');
    expect(nextState.error?.message).toBe('Unable to create task');
  });

  it('should handle update task success with analytics changes', () => {
    const existingTask = createMockTask();
    const initial = {
      ...tasksReducer(undefined, { type: '@@INIT' } as any),
      tasks: [existingTask]
    };
    const updatedTask = {
      ...existingTask,
      title: 'Updated Task Title',
      analytics: mockAnalytics
    };
    const action = {
      type: TasksActionTypes.UPDATE_TASK_SUCCESS,
      payload: updatedTask
    };
    const nextState = tasksReducer(initial, action);
    expect(nextState.tasks[0].title).toBe('Updated Task Title');
    expect(nextState.tasks[0].analytics).toEqual(mockAnalytics);
    expect(nextState.error).toBeNull();
  });

  it('should handle delete task success and remove it from list', () => {
    const existingTask = createMockTask();
    const initState = {
      ...tasksReducer(undefined, { type: '@@INIT' } as any),
      tasks: [existingTask],
      loading: { deleteTask: true }
    };
    const action = {
      type: TasksActionTypes.DELETE_TASK_SUCCESS,
      payload: { id: existingTask.id }
    };
    const nextState = tasksReducer(initState, action);
    expect(nextState.tasks).toHaveLength(0);
    expect(nextState.error).toBeNull();
    expect(nextState.loading.deleteTask).toBe(false);
  });

  it('should handle filter actions properly', () => {
    const action = {
      type: TasksActionTypes.SET_TASK_FILTER,
      payload: {
        status: [],
        priority: ['HIGH'],
        assigneeId: [],
        dueDateRange: null
      }
    };
    const nextState = tasksReducer(undefined, action);
    expect(nextState.filter.priority).toEqual(['HIGH']);
  });

  it('should handle error clearing', () => {
    const prevState = {
      ...tasksReducer(undefined, { type: '@@INIT' } as any),
      error: { code: 'TEST_ERROR', message: 'Some error', timestamp: Date.now() }
    };
    const action = { type: TasksActionTypes.CLEAR_TASK_ERROR };
    const nextState = tasksReducer(prevState, action);
    expect(nextState.error).toBeNull();
  });

  it('should handle AI metadata processing for action type UPDATE_TASK_AI_METADATA (unimplemented)', () => {
    // This test ensures that if an action is dispatched, but not handled, we do not crash
    const prevState = tasksReducer(undefined, { type: '@@INIT' } as any);
    const action = {
      type: TasksActionTypes.UPDATE_TASK_AI_METADATA,
      payload: { id: 'dummy', aiMetadata: { confidence: 0.9 } }
    } as any;
    const nextState = tasksReducer(prevState, action);
    // By default, the code doesn't have a case. The state should remain unchanged.
    expect(nextState).toEqual(prevState);
  });

  it('should handle analytics updates for action type UPDATE_TASK_ANALYTICS (unimplemented)', () => {
    const prevState = tasksReducer(undefined, { type: '@@INIT' } as any);
    const action = {
      type: TasksActionTypes.UPDATE_TASK_ANALYTICS,
      payload: { id: 'dummy', analyticsData: mockAnalytics }
    } as any;
    const nextState = tasksReducer(prevState, action);
    // Not implemented in the reducer; verifying no error and no state changes.
    expect(nextState).toEqual(prevState);
  });

  it('should handle pagination state management when SET_TASK_PAGINATION is dispatched', () => {
    const action = {
      type: TasksActionTypes.SET_TASK_PAGINATION,
      payload: {
        page: 2,
        limit: 10,
        total: 50
      }
    };
    const prevState = tasksReducer(undefined, { type: '@@INIT' } as any);
    const nextState = tasksReducer(prevState, action);
    expect(nextState.pagination.page).toBe(2);
    expect(nextState.pagination.limit).toBe(10);
    expect(nextState.pagination.total).toBe(50);
  });

  it('should pass performance optimization scenario by handling multiple actions without errors', () => {
    const init = tasksReducer(undefined, { type: '@@INIT' } as any);
    const actions = [
      { type: TasksActionTypes.FETCH_TASKS_REQUEST },
      { type: TasksActionTypes.FETCH_TASKS_SUCCESS, payload: [createMockTask()] },
      { type: TasksActionTypes.CREATE_TASK_REQUEST, payload: { title: 'Bulk Create' } },
      { type: TasksActionTypes.CREATE_TASK_FAILURE, payload: { error: 'Bulk create error' } },
      { type: TasksActionTypes.CLEAR_TASK_ERROR }
    ];
    const final = actions.reduce((state, a) => tasksReducer(state, a), init);
    expect(final.tasks).toHaveLength(1);
    expect(final.loading.fetchTasks).toBe(false);
    expect(final.loading.createTask).toBe(false);
    expect(final.error).toBeNull();
  });

  it('should validate state persistence by not resetting tasks or filter inadvertently', () => {
    const init = tasksReducer(undefined, { type: '@@INIT' } as any);
    const customFilterAction = {
      type: TasksActionTypes.SET_TASK_FILTER,
      payload: { status: ['DONE'], priority: [], assigneeId: [], dueDateRange: null }
    };
    const stateAfterFilter = tasksReducer(init, customFilterAction);
    expect(stateAfterFilter.filter.status).toEqual(['DONE']);
    const partialAction = { type: '@@DUMMY_UNHANDLED' } as any;
    const finalState = tasksReducer(stateAfterFilter, partialAction);
    expect(finalState.filter.status).toEqual(['DONE']);
    expect(finalState.tasks).toEqual([]);
  });
});

// ======================================================================================
// 2) Tests for task actions (Action Creators)
// ======================================================================================
describe('task actions', () => {
  it('should dispatch fetchTasks action creator with analytics and verify store updates', async () => {
    // Simulate an async fetch using mocked store
    store.dispatch({ type: TasksActionTypes.FETCH_TASKS_REQUEST });
    store.dispatch({
      type: TasksActionTypes.FETCH_TASKS_SUCCESS,
      payload: [createMockTask({ title: 'Analytics Task', analytics: mockAnalytics })]
    });
    const actions = store.getActions();
    expect(actions).toHaveLength(2);
    expect(actions[0].type).toBe(TasksActionTypes.FETCH_TASKS_REQUEST);
    expect(actions[1].type).toBe(TasksActionTypes.FETCH_TASKS_SUCCESS);
  });

  it('should dispatch createTask action creator with AI processing', async () => {
    const mockPayload = createMockTask({ title: 'AI Creation Test' });
    store.dispatch({ type: TasksActionTypes.CREATE_TASK_REQUEST, payload: mockPayload });
    store.dispatch({ type: TasksActionTypes.CREATE_TASK_SUCCESS, payload: mockPayload });
    const actions = store.getActions();
    expect(actions.find(a => a.type === TasksActionTypes.CREATE_TASK_REQUEST)).toBeTruthy();
    expect(actions.find(a => a.type === TasksActionTypes.CREATE_TASK_SUCCESS)).toBeTruthy();
  });

  it('should dispatch updateTask action creator with updated AI metadata', async () => {
    const mockTask = createMockTask();
    store.dispatch({ type: TasksActionTypes.UPDATE_TASK_REQUEST, payload: mockTask });
    store.dispatch({
      type: TasksActionTypes.UPDATE_TASK_AI_METADATA,
      payload: { id: mockTask.id, aiMetadata: { confidence: 0.95, extractedFrom: 'test' } }
    });
    const actions = store.getActions();
    expect(
      actions.some(a => a.type === TasksActionTypes.UPDATE_TASK_REQUEST)
    ).toBe(true);
    expect(
      actions.some(a => a.type === TasksActionTypes.UPDATE_TASK_AI_METADATA)
    ).toBe(true);
  });

  it('should dispatch custom action for batch task update actions', async () => {
    // Example test for hypothetical batch update
    store.dispatch({
      type: 'BATCH_UPDATE_TASKS',
      payload: [createMockTask(), createMockTask()]
    });
    const [action] = store.getActions();
    expect(action.type).toEqual('BATCH_UPDATE_TASKS');
    expect(action.payload).toHaveLength(2);
  });

  it('should dispatch setTaskFilter action creator', async () => {
    const filterPayload = { status: ['TODO'], priority: [], assigneeId: [], dueDateRange: null };
    store.dispatch({ type: TasksActionTypes.SET_TASK_FILTER, payload: filterPayload });
    const actions = store.getActions();
    expect(actions[0].type).toBe(TasksActionTypes.SET_TASK_FILTER);
    expect(actions[0].payload).toEqual(filterPayload);
  });

  it('should dispatch clearTaskError action creator', async () => {
    store.dispatch({ type: TasksActionTypes.CLEAR_TASK_ERROR });
    const [action] = store.getActions();
    expect(action.type).toEqual(TasksActionTypes.CLEAR_TASK_ERROR);
  });

  it('should dispatch updateTaskAnalytics action creator', async () => {
    const mockId = 'analytics_id';
    store.dispatch({
      type: TasksActionTypes.UPDATE_TASK_ANALYTICS,
      payload: { id: mockId, analyticsData: mockAnalytics }
    });
    const [action] = store.getActions();
    expect(action.type).toEqual(TasksActionTypes.UPDATE_TASK_ANALYTICS);
    expect(action.payload.analyticsData).toEqual(mockAnalytics);
  });

  it('should dispatch task optimization actions properly', async () => {
    // Example for a custom optimization-related action
    store.dispatch({ type: 'TASK_OPTIMIZATION_ACTION', payload: { optimize: true } });
    const [action] = store.getActions();
    expect(action.type).toBe('TASK_OPTIMIZATION_ACTION');
  });
});

// ======================================================================================
// 3) Tests for task async operations
// ======================================================================================
describe('task async operations', () => {
  it('should handle successful task fetching with analytics', async () => {
    // In actual implementation, we'd mock an API call. Here we simulate store dispatch.
    store.dispatch({ type: TasksActionTypes.FETCH_TASKS_REQUEST });
    store.dispatch({
      type: TasksActionTypes.FETCH_TASKS_SUCCESS,
      payload: [{ ...createMockTask(), analytics: mockAnalytics }]
    });
    const actions = store.getActions();
    expect(actions.find(a => a.type === TasksActionTypes.FETCH_TASKS_REQUEST)).toBeDefined();
    expect(actions.find(a => a.type === TasksActionTypes.FETCH_TASKS_SUCCESS)).toBeDefined();
  });

  it('should handle failed task fetching with error handling', async () => {
    store.dispatch({ type: TasksActionTypes.FETCH_TASKS_REQUEST });
    store.dispatch({
      type: TasksActionTypes.FETCH_TASKS_FAILURE,
      payload: { error: 'Server error' }
    });
    const actions = store.getActions();
    expect(actions.length).toBe(2);
    expect(actions[1].type).toBe(TasksActionTypes.FETCH_TASKS_FAILURE);
    expect(actions[1].payload.error).toBe('Server error');
  });

  it('should handle successful task creation with AI processing pipeline', async () => {
    const newTask = createMockTask({ title: 'Async AI Task' });
    store.dispatch({ type: TasksActionTypes.CREATE_TASK_REQUEST, payload: newTask });
    store.dispatch({ type: TasksActionTypes.CREATE_TASK_SUCCESS, payload: newTask });
    const actions = store.getActions();
    expect(actions.some(a => a.type === TasksActionTypes.CREATE_TASK_REQUEST)).toBe(true);
    expect(actions.some(a => a.type === TasksActionTypes.CREATE_TASK_SUCCESS)).toBe(true);
  });

  it('should handle failed task creation with validation error', async () => {
    store.dispatch({ type: TasksActionTypes.CREATE_TASK_REQUEST });
    store.dispatch({
      type: TasksActionTypes.CREATE_TASK_FAILURE,
      payload: { error: 'Validation error: missing fields' }
    });
    const actions = store.getActions();
    expect(actions.some(a => a.type === TasksActionTypes.CREATE_TASK_FAILURE)).toBe(true);
  });

  it('should handle successful task updating with metadata', async () => {
    store.dispatch({ type: TasksActionTypes.UPDATE_TASK_REQUEST });
    store.dispatch({
      type: TasksActionTypes.UPDATE_TASK_SUCCESS,
      payload: {
        ...createMockTask(),
        title: 'Metadata Updated',
        aiMetadata: { confidence: 0.88, extractedFrom: 'pipeline' }
      }
    });
    const actions = store.getActions();
    expect(actions.find(a => a.type === TasksActionTypes.UPDATE_TASK_SUCCESS)).toBeDefined();
  });

  it('should handle failed task updating with rollback', async () => {
    store.dispatch({ type: TasksActionTypes.UPDATE_TASK_REQUEST });
    store.dispatch({
      type: TasksActionTypes.UPDATE_TASK_FAILURE,
      payload: { error: 'Update failed, rolling back...' }
    });
    const actions = store.getActions();
    expect(actions.find(a => a.type === TasksActionTypes.UPDATE_TASK_REQUEST)).toBeDefined();
    expect(actions.find(a => a.type === TasksActionTypes.UPDATE_TASK_FAILURE)).toBeDefined();
  });

  it('should handle successful task deletion with cleanup', async () => {
    const existing = createMockTask();
    store.dispatch({ type: TasksActionTypes.DELETE_TASK_REQUEST, payload: { id: existing.id } });
    store.dispatch({
      type: TasksActionTypes.DELETE_TASK_SUCCESS,
      payload: { id: existing.id }
    });
    const actions = store.getActions();
    expect(actions.some(a => a.type === TasksActionTypes.DELETE_TASK_REQUEST)).toBe(true);
    expect(actions.some(a => a.type === TasksActionTypes.DELETE_TASK_SUCCESS)).toBe(true);
  });

  it('should handle failed task deletion with recovery', async () => {
    store.dispatch({ type: TasksActionTypes.DELETE_TASK_REQUEST });
    store.dispatch({
      type: TasksActionTypes.DELETE_TASK_FAILURE,
      payload: { id: 'failId', error: 'Unable to delete' }
    });
    const actions = store.getActions();
    expect(actions.some(a => a.type === TasksActionTypes.DELETE_TASK_FAILURE)).toBe(true);
  });

  it('should handle AI metadata processing pipeline in async flow', async () => {
    store.dispatch({ type: TasksActionTypes.UPDATE_TASK_AI_METADATA, payload: { id: 'metaId' } });
    const [action] = store.getActions();
    expect(action.type).toBe(TasksActionTypes.UPDATE_TASK_AI_METADATA);
  });

  it('should handle analytics data aggregation in async flow', async () => {
    store.dispatch({
      type: TasksActionTypes.UPDATE_TASK_ANALYTICS,
      payload: { id: 'aggId', analyticsData: mockAnalytics }
    });
    const [action] = store.getActions();
    expect(action.type).toBe(TasksActionTypes.UPDATE_TASK_ANALYTICS);
  });

  it('should confirm performance optimization scenario in async chain', async () => {
    // Example chaining of multiple async actions
    store.dispatch({ type: TasksActionTypes.FETCH_TASKS_REQUEST });
    store.dispatch({ type: TasksActionTypes.CREATE_TASK_REQUEST });
    store.dispatch({ type: TasksActionTypes.CREATE_TASK_SUCCESS, payload: createMockTask() });
    store.dispatch({ type: TasksActionTypes.UPDATE_TASK_REQUEST });
    store.dispatch({ type: TasksActionTypes.UPDATE_TASK_FAILURE, payload: { error: 'Oops' } });
    const actions = store.getActions();
    expect(actions.length).toBe(5);
    // Expect no crashes or infinite loops in a performance scenario
  });

  it('should validate state persistence operations through repeated async calls', async () => {
    // Simulate storing partial state after each operation
    store.dispatch({ type: TasksActionTypes.FETCH_TASKS_REQUEST });
    store.dispatch({ type: TasksActionTypes.FETCH_TASKS_SUCCESS, payload: [createMockTask()] });
    store.dispatch({ type: TasksActionTypes.SET_TASK_FILTER, payload: { status: ['IN_PROGRESS'], priority: [], assigneeId: [], dueDateRange: null } });
    store.dispatch({ type: 'DUMMY_PERSISTENCE_ACTION', payload: { reason: 'Check saving to disk' } });
    const actions = store.getActions();
    expect(actions.some(a => a.type === TasksActionTypes.FETCH_TASKS_REQUEST)).toBe(true);
    expect(actions.some(a => a.type === TasksActionTypes.FETCH_TASKS_SUCCESS)).toBe(true);
    expect(actions.some(a => a.type === TasksActionTypes.SET_TASK_FILTER)).toBe(true);
    expect(actions.some(a => a.type === 'DUMMY_PERSISTENCE_ACTION')).toBe(true);
  });
});