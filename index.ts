// Custom minimist types and refactor
//
// FORMERLY:
// Type definitions for minimist 1.2
// Project: https://github.com/substack/minimist
// Definitions by: Bart van der Schoor <https://github.com/Bartvds>
//                 Necroskillz <https://github.com/Necroskillz>
//                 kamranayub <https://github.com/kamranayub>
//                 Piotr Błażejewicz <https://github.com/peterblazejewicz>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

export interface Opts {
  /**
   * A string or array of strings argument names to always treat as strings
   */
  'string'?: string | string[];

  /**
   * A boolean, string or array of strings to always treat as booleans. If true will treat
   * all double hyphenated arguments without equals signs as boolean (e.g. affects `--foo`, not `-f` or `--foo=bar`)
   */
  'boolean'?: boolean | string | string[];

  /**
   * An object mapping string names to strings or arrays of string argument names to use as aliases
   */
  'alias'?: Record<string, string | string[]>;

  /**
   * An object mapping string argument names to default values
   */
  'default'?: Record<string, any>;

  /**
   * When true, populate argv._ with everything after the first non-option
   */
  'stopEarly'?: boolean;

  /**
   * A function which is invoked with a command line parameter not defined in the opts
   * configuration object. If the function returns false, the unknown option is not added to argv
   */
  'unknown'?: (arg: string, extra: {}) => boolean;

  /**
   * When true, populate argv._ with everything before the -- and argv['--'] with everything after the --.
   * Note that with -- set, parsing for arguments still stops after the `--`.
   */
  '--'?: boolean;
}

export type ParsedArgs<T = Record<string, any>> = T & {
  /**
   * If opts['--'] is true, populated with everything after the --
   */
  '--'?: string[];

  /**
   * Contains all the arguments that didn't have an option associated with them
   */
  '_': string[];
};

const hasKey = (obj: any, key: string): boolean => key in obj;

const isNumber = (x: any): boolean => {
  if (typeof x === 'number') {
    return true;
  }

  if (/^0x[0-9a-f]+$/i.test(x)) {
    return true;
  }

  return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/.test(x);
};

export const minimist = <T = Record<string, any>>(args: string[], opts?: Opts): ParsedArgs<T> => {
  opts = opts || {};

  const flags: any = { bools: {}, strings: {}, unknownFn: null };
  const aliases: any = {};
  const argv: any = { _: [] };
  const defaults = opts.default || {};

  if (typeof opts['unknown'] === 'function') {
    flags.unknownFn = opts['unknown'];
  }

  if (typeof opts['boolean'] === 'boolean' && opts['boolean']) {
    flags.allBools = true;
  } else {
    []
      .concat(opts['boolean'])
      .filter(Boolean)
      .forEach((key) => {
        flags.bools[key] = true;
      });
  }

  Object.keys(opts.alias || {}).forEach((key) => {
    aliases[key] = [].concat(opts.alias[key]);
    aliases[key].forEach((x: any) => {
      aliases[x] = [key].concat(
        aliases[key].filter((y: any) => {
          return x !== y;
        })
      );
    });
  });

  []
    .concat(opts.string)
    .filter(Boolean)
    .forEach((key) => {
      flags.strings[key] = true;
      if (aliases[key]) {
        flags.strings[aliases[key]] = true;
      }
    });

  const argDefined = (key: any, arg: any) =>
    (flags.allBools && /^--[^=]+$/.test(arg)) || flags.strings[key] || flags.bools[key] || aliases[key];

  const aliasIsBoolean = (key: any) => aliases[key].some((x: any) => flags.bools[x]);

  const setKey = (obj: any, key: string, value: any) => {
    if (
      key === '__proto__' ||
      obj === Object.prototype ||
      obj === Number.prototype ||
      obj === String.prototype ||
      obj === Array.prototype
    ) {
      console.trace({ obj, key, value, to: typeof obj, tk: typeof key, tv: typeof value });
      throw new Error('invalid key name');
    }

    if (obj[key] === undefined || flags.bools[key] || typeof obj[key] === 'boolean') {
      obj[key] = value;
    } else if (Array.isArray(obj[key])) {
      obj[key].push(value);
    } else {
      obj[key] = [obj[key], value];
    }
  };

  const setArg = (key: any, val: any, arg?: any) => {
    if (arg && flags.unknownFn && !argDefined(key, arg)) {
      if (flags.unknownFn(arg, { key, val, min: this }) === false) return;
    }

    const value = !flags.strings[key] && isNumber(val) ? Number(val) : val;
    setKey(argv, key, value);

    (aliases[key] || []).forEach((x: any) => {
      setKey(argv, x, value);
    });
  };

  Object.keys(flags.bools).forEach((key) => {
    if (typeof defaults[key] === 'boolean') {
      setArg(key, defaults[key]);
    }
  });

  let notFlags: any[] = [];

  if (args.indexOf('--') !== -1) {
    notFlags = args.slice(args.indexOf('--') + 1);
    args = args.slice(0, args.indexOf('--'));
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (/^--.+=/.test(arg)) {
      // Using [\s\S] instead of . because js doesn't support the
      // 'dotall' regex modifier. See:
      // http://stackoverflow.com/a/1068308/13216
      const m = arg.match(/^--([^=]+)=([\s\S]*)$/);
      const key = m[1];
      let value: any = m[2];
      if (flags.bools[key]) {
        value = value !== 'false';
      }
      setArg(key, value, arg);
    } else if (/^--.+/.test(arg)) {
      const key = arg.match(/^--(.+)/)[1];
      const next = args[i + 1];
      if (
        next !== undefined &&
        !/^-/.test(next) &&
        !flags.bools[key] &&
        !flags.allBools &&
        (aliases[key] ? !aliasIsBoolean(key) : true)
      ) {
        setArg(key, next, arg);
        i++;
      } else if (/^(true|false)$/.test(next)) {
        setArg(key, next === 'true', arg);
        i++;
      } else {
        setArg(key, flags.strings[key] ? '' : true, arg);
      }
    } else if (/^-[^-]+/.test(arg)) {
      const letters = arg.slice(1, -1).split('');

      let broken = false;
      for (let j = 0; j < letters.length; j++) {
        const next = arg.slice(j + 2);

        if (next === '-') {
          setArg(letters[j], next, arg);
          continue;
        }

        if (/[A-Za-z]/.test(letters[j]) && /=/.test(next)) {
          setArg(letters[j], next.replace(/^=/, ''), arg);
          broken = true;
          break;
        }

        if (/[A-Za-z]/.test(letters[j]) && /-?\d+(\.\d*)?(e-?\d+)?$/.test(next)) {
          setArg(letters[j], next, arg);
          broken = true;
          break;
        }

        if (letters[j + 1] && letters[j + 1].match(/\W/)) {
          setArg(letters[j], arg.slice(j + 2), arg);
          broken = true;
          break;
        } else {
          setArg(letters[j], flags.strings[letters[j]] ? '' : true, arg);
        }
      }

      const key = arg.slice(-1)[0];
      if (!broken && key !== '-') {
        if (
          args[i + 1] &&
          !/^(-|--)[^-]/.test(args[i + 1]) &&
          !flags.bools[key] &&
          (aliases[key] ? !aliasIsBoolean(key) : true)
        ) {
          setArg(key, args[i + 1], arg);
          i++;
        } else if (args[i + 1] && /^(true|false)$/.test(args[i + 1])) {
          setArg(key, args[i + 1] === 'true', arg);
          i++;
        } else {
          setArg(key, flags.strings[key] ? '' : true, arg);
        }
      }
    } else {
      if (!flags.unknownFn || flags.unknownFn(arg) !== false) {
        argv._.push(flags.strings['_'] || !isNumber(arg) ? arg : Number(arg));
      }
      if (opts.stopEarly) {
        argv._.push.apply(argv._, args.slice(i + 1));
        break;
      }
    }
  }

  Object.keys(defaults).forEach((key) => {
    if (!hasKey(argv, key)) {
      setKey(argv, key, defaults[key]);

      (aliases[key] || []).forEach((x: any) => {
        setKey(argv, x, defaults[key]);
      });
    }
  });

  if (opts['--']) {
    argv['--'] = [];
    notFlags.forEach((key) => {
      argv['--'].push(key);
    });
  } else {
    notFlags.forEach((key) => {
      argv._.push(key);
    });
  }

  return argv;
};
