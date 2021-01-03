import ts from 'typescript';
import { LandaConfig } from '../config';

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (path) => path,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine,
};

export function tsWatch(config: LandaConfig) {
  return new Promise((yay, nay) => {
    function reportDiagnostic(diagnostic: ts.Diagnostic) {
      console.error(
        'Error',
        diagnostic.code,
        ':',
        ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          formatHost.getNewLine()
        )
      );
    }

    /**
     * Prints a diagnostic every time the watch status changes.
     * This is mainly for messages like "Starting compilation" or "Compilation completed".
     */
    function reportWatchStatusChanged(diagnostic: ts.Diagnostic) {
      console.info(
        diagnostic.code,
        diagnostic.category,
        ts.formatDiagnostic(diagnostic, formatHost)
      );
    }

    // TypeScript can use several different program creation "strategies":
    //  * ts.createEmitAndSemanticDiagnosticsBuilderProgram,
    //  * ts.createSemanticDiagnosticsBuilderProgram
    //  * ts.createAbstractBuilder
    // The first two produce "builder programs". These use an incremental strategy
    // to only re-check and emit files whose contents may have changed, or whose
    // dependencies may have changes which may impact change the result of prior
    // type-check and emit.
    // The last uses an ordinary program which does a full type check after every
    // change.
    // Between `createEmitAndSemanticDiagnosticsBuilderProgram` and
    // `createSemanticDiagnosticsBuilderProgram`, the only difference is emit.
    // For pure type-checking scenarios, or when another tool/process handles emit,
    // using `createSemanticDiagnosticsBuilderProgram` may be more desirable.
    const createProgram = ts.createSemanticDiagnosticsBuilderProgram;

    // Note that there is another overload for `createWatchCompilerHost` that takes
    // a set of root files.
    const host = ts.createWatchCompilerHost(
      config.tsConfigPath,
      {},
      ts.sys,
      createProgram,
      reportDiagnostic,
      reportWatchStatusChanged
    );

    // You can technically override any given hook on the host, though you probably
    // don't need to.
    // Note that we're assuming `origCreateProgram` and `origPostProgramCreate`
    // doesn't use `this` at all.
    const origCreateProgram = host.createProgram;
    host.createProgram = (
      rootNames: ReadonlyArray<string>,
      options,
      host,
      oldProgram
    ) => {
      console.log('** Recompiling .. **');
      return origCreateProgram(rootNames, options, host, oldProgram);
    };
    const origPostProgramCreate = host.afterProgramCreate;

    let resolved = false;
    host.afterProgramCreate = (program) => {
      console.log('** Recompiling done **');
      origPostProgramCreate!(program);
      if (!resolved) {
        yay(program);
        resolved = true;
      }
    };

    // `createWatchProgram` creates an initial program, watches files, and updates
    // the program over time.
    ts.createWatchProgram(host);
  });
}
