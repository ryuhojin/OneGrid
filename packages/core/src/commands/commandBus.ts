import type { GridState, GridStateUpdater } from "../state/index.js";

export interface GridCommand<TData = unknown, TPayload = unknown> {
  readonly id: string;
  execute(context: GridCommandContext<TData>, payload: TPayload): GridCommandResult<TData>;
  undo?(context: GridCommandContext<TData>, entry: ExecutedCommand<TData, TPayload>): GridState<TData>;
}

export interface GridCommandContext<TData = unknown> {
  readonly state: GridState<TData>;
}

export interface GridCommandResult<TData = unknown> {
  readonly update: GridStateUpdater<TData>;
  readonly label?: string;
  readonly reversible?: boolean;
}

export interface ExecutedCommand<TData = unknown, TPayload = unknown> {
  readonly id: string;
  readonly payload: TPayload;
  readonly previous: GridState<TData>;
  readonly next: GridState<TData>;
  readonly label: string;
  readonly reversible: boolean;
}

export interface CommandBus<TData = unknown> {
  register<TPayload>(command: GridCommand<TData, TPayload>): () => void;
  get<TPayload>(commandId: string): GridCommand<TData, TPayload> | undefined;
  execute<TPayload>(
    commandId: string,
    payload: TPayload,
    context: GridCommandContext<TData>
  ): ExecutedCommand<TData, TPayload>;
  clear(): void;
}

export function createCommandBus<TData = unknown>(): CommandBus<TData> {
  const commands = new Map<string, GridCommand<TData, unknown>>();

  return {
    register(command) {
      if (commands.has(command.id)) {
        throw new Error(`Command is already registered: ${command.id}`);
      }

      commands.set(command.id, command as GridCommand<TData, unknown>);
      return () => {
        commands.delete(command.id);
      };
    },
    get(commandId) {
      return commands.get(commandId) as GridCommand<TData, never> | undefined;
    },
    execute(commandId, payload, context) {
      const command = commands.get(commandId) as GridCommand<TData, typeof payload> | undefined;

      if (!command) {
        throw new Error(`Command is not registered: ${commandId}`);
      }

      const result = command.execute(context, payload);
      const next = result.update(context.state);

      return {
        id: commandId,
        payload,
        previous: context.state,
        next,
        label: result.label ?? commandId,
        reversible: result.reversible ?? Boolean(command.undo)
      };
    },
    clear() {
      commands.clear();
    }
  };
}
