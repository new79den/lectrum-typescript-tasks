
interface i_defaults {
     symbol: string,
     separator: string,
     decimal: string,
     formatWithSymbol: boolean,
     errorOnInvalid: boolean,
     precision: number,
     pattern: string,
     negativePattern: string
}

const defaults: i_defaults = {
    symbol: '$',
    separator: ',',
    decimal: '.',
    formatWithSymbol: false,
    errorOnInvalid: false,
    precision: 2,
    pattern: '!#',
    negativePattern: '-!#'
};

interface i_opts {
    symbol?: string,
    separator?: string,
    decimal?: string,
    formatWithSymbol?: boolean,
    errorOnInvalid?: boolean,
    precision?: number,
    pattern?: string,
    negativePattern?: string,
    increment?: number,
    useVedic?: RegExp,
    groups?: RegExp,
}

type t_round = (v: number) => number;
const round: t_round = v => Math.round(v);

type t_pow = (p: number) => number;
const pow: t_pow = p => Math.pow(10, p);

type t_rounding = (value: number, increment: number) => number;
const rounding: t_rounding = (value, increment) => round(value / increment) * increment;


const groupRegex: RegExp = /(\d)(?=(\d{3})+\b)/g;
const vedicRegex: RegExp = /(\d)(?=(\d\d)+\d\b)/g;

/**
 * Create a new instance of currency.js
 * @param {number|string|currency} value
 * @param {object} [opts]
 */

interface i_currency {
    intValue: number,
    value: number,
    _settings: any,
    _precision: any,
    add(number: number): any, // ?
    subtract(number:number): any, // ?
    multiply(number: number): any, // ?
    divide(number: number): any, //?
    distribute(count: number),
    dollars(): number,
    cents(): number,
    format(useSymbol: boolean): string,
    toString(): string,
    toJSON(): number
}

interface i_currencyConstructor {
    new (value, opts: i_opts): i_currency,
    prototype: i_currency,
}

const currency = function (value: number | HTMLInputElement, opts: i_opts) {
    let that = this;

    if(!(that instanceof currency)) {
        return new currency(value, opts);
    }

    let settings: i_opts = (<any>Object).assign({}, defaults, opts)
        , precision: number = pow(settings.precision)
        , v: number = parse(value, settings);

    that.intValue = v;
    that.value = v / precision;

    // Set default incremental value
    settings.increment = settings.increment || (1 / precision);

    // Support vedic numbering systems
    // see: https://en.wikipedia.org/wiki/Indian_numbering_system
    if(settings.useVedic) {
        settings.groups = vedicRegex;
    } else {
        settings.groups = groupRegex;
    }

    // Intended for internal usage only - subject to change
    this._settings = settings;
    this._precision = precision;
} as Function as i_currencyConstructor;



type t_value = number | string | HTMLInputElement; // ??? не понял что с ним делать
function parse(value: t_value, opts: i_opts , useRounding:boolean = true) : number {
    let v:number = 0
        , { decimal, errorOnInvalid, precision: decimals }: i_opts = opts
        , precision: number = pow(decimals)
        , isNumber: boolean = typeof value === 'number';

    if (isNumber || value instanceof currency) {
        v = ((isNumber ? value : value.value ) * precision);
    } else if (typeof value === 'string') {
        let regex = new RegExp('[^-\\d' + decimal + ']', 'g')
            , decimalString = new RegExp('\\' + decimal, 'g');
        v = value
                .replace(/\((.*)\)/, '-$1')   // allow negative e.g. (1.99)
                .replace(regex, '')           // replace any non numeric values
                .replace(decimalString, '.')  // convert any decimal values
            * precision;                  // scale number to integer value
        v = v || 0;
    } else {
        if(errorOnInvalid) {
            throw Error('Invalid Input');
        }
        v = 0;
    }

    // Handle additional decimal for proper rounding.
    v = v.toFixed(4);

    return useRounding ? round(v) : v;
}

currency.prototype = {

    /**
     * Adds values together.
     * @param {number} number
     * @returns {currency}
     */
    add(number) {
        let { intValue, _settings, _precision } = this;
        return currency((intValue += parse(number, _settings)) / _precision, _settings);
    },

    /**
     * Subtracts value.
     * @param {number} number
     * @returns {currency}
     */
    subtract(number) {
        let { intValue, _settings, _precision } = this;
        return currency((intValue -= parse(number, _settings)) / _precision, _settings);
    },

    /**
     * Multiplies values.
     * @param {number} number
     * @returns {currency}
     */
    multiply(number) {
        let { intValue, _settings } = this;
        return currency((intValue *= number) / pow(_settings.precision), _settings);
    },

    /**
     * Divides value.
     * @param {number} number
     * @returns {currency}
     */
    divide(number) {
        let { intValue, _settings } = this;
        return currency(intValue /= parse(number, _settings, false), _settings);
    },

    /**
     * Takes the currency amount and distributes the values evenly. Any extra pennies
     * left over from the distribution will be stacked onto the first set of entries.
     * @param {number} count
     * @returns {array}
     */
    distribute(count) {
        let { intValue, _precision, _settings } = this
            , distribution: Array<i_currency> = []
            , split: number = Math[intValue >= 0 ? 'floor' : 'ceil'](intValue / count)
            , pennies: number = Math.abs(intValue - (split * count));

        for (; count !== 0; count--) {
            let item: i_currency = new currency(split / _precision, _settings);

            // Add any left over pennies
            pennies-- > 0 && (item = intValue >= 0 ? item.add(1 / _precision) : item.subtract(1 / _precision));

            distribution.push(item);
        }

        return distribution;
    },

    /**
     * Returns the dollar value.
     * @returns {number}
     */
    dollars() {
        return ~~this.value;
    },

    /**
     * Returns the cent value.
     * @returns {number}
     */
    cents() {
        let { intValue, _precision } = this;
        return ~~(intValue % _precision);
    },

    /**
     * Formats the value as a string according to the formatting settings.
     * @param {boolean} useSymbol - format with currency symbol
     * @returns {string}
     */
    format(useSymbol) {
        let { pattern, negativePattern, formatWithSymbol, symbol, separator, decimal, groups } = this._settings
            , values: Array<string> = (this + '').replace(/^-/, '').split('.')
            , dollars: string = values[0]
            , cents: string = values[1];

        // set symbol formatting
        typeof(useSymbol) === 'undefined' && (useSymbol = formatWithSymbol);

        return (this.value >= 0 ? pattern : negativePattern)
            .replace('!', useSymbol ? symbol : '')
            .replace('#', `${dollars.replace(groups, '$1' + separator)}${cents ? decimal + cents : ''}`);
    },

    /**
     * Formats the value as a string according to the formatting settings.
     * @returns {string}
     */
    toString() {
        let { intValue, _precision, _settings } = this;
        return rounding(intValue / _precision, _settings.increment).toFixed(_settings.precision);
    },

    /**
     * Value for JSON serialization.
     * @returns {float}
     */
    toJSON() {
        return this.value;
    }

};

export default currency;