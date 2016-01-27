(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    global.d3 = factory();
}(this, function () { 'use strict';

    var __scale = {
        get category10 () { return category10; },
        get category20 () { return category20; },
        get category20b () { return category20b; },
        get category20c () { return category20c; },
        get identity () { return __identity; },
        get linear () { return _linear; },
        get log () { return log; },
        get ordinal () { return ordinal; },
        get pow () { return pow; },
        get quantile () { return _quantile; },
        get quantize () { return quantize; },
        get sqrt () { return sqrt; },
        get threshold () { return threshold; },
        get time () { return time; },
        get utcTime () { return utcTime; }
    };

    function _dsv(delimiter) {
      var reFormat = new RegExp("[\"" + delimiter + "\n]"),
          delimiterCode = delimiter.charCodeAt(0);

      function parse(text, f) {
        var o;
        return parseRows(text, function(row, i) {
          if (o) return o(row, i - 1);
          var a = new Function("d", "return {" + row.map(function(name, i) {
            return JSON.stringify(name) + ": d[" + i + "]";
          }).join(",") + "}");
          o = f ? function(row, i) { return f(a(row), i); } : a;
        });
      }

      function parseRows(text, f) {
        var EOL = {}, // sentinel value for end-of-line
            EOF = {}, // sentinel value for end-of-file
            rows = [], // output rows
            N = text.length,
            I = 0, // current character index
            n = 0, // the current line number
            t, // the current token
            eol; // is the current token followed by EOL?

        function token() {
          if (I >= N) return EOF; // special case: end of file
          if (eol) return eol = false, EOL; // special case: end of line

          // special case: quotes
          var j = I;
          if (text.charCodeAt(j) === 34) {
            var i = j;
            while (i++ < N) {
              if (text.charCodeAt(i) === 34) {
                if (text.charCodeAt(i + 1) !== 34) break;
                ++i;
              }
            }
            I = i + 2;
            var c = text.charCodeAt(i + 1);
            if (c === 13) {
              eol = true;
              if (text.charCodeAt(i + 2) === 10) ++I;
            } else if (c === 10) {
              eol = true;
            }
            return text.slice(j + 1, i).replace(/""/g, "\"");
          }

          // common case: find next delimiter or newline
          while (I < N) {
            var c = text.charCodeAt(I++), k = 1;
            if (c === 10) eol = true; // \n
            else if (c === 13) { eol = true; if (text.charCodeAt(I) === 10) ++I, ++k; } // \r|\r\n
            else if (c !== delimiterCode) continue;
            return text.slice(j, I - k);
          }

          // special case: last token before EOF
          return text.slice(j);
        }

        while ((t = token()) !== EOF) {
          var a = [];
          while (t !== EOL && t !== EOF) {
            a.push(t);
            t = token();
          }
          if (f && (a = f(a, n++)) == null) continue;
          rows.push(a);
        }

        return rows;
      }

      function format(rows) {
        if (Array.isArray(rows[0])) return formatRows(rows); // deprecated; use formatRows
        var fieldSet = Object.create(null), fields = [];

        // Compute unique fields in order of discovery.
        rows.forEach(function(row) {
          for (var field in row) {
            if (!((field += "") in fieldSet)) {
              fields.push(fieldSet[field] = field);
            }
          }
        });

        return [fields.map(formatValue).join(delimiter)].concat(rows.map(function(row) {
          return fields.map(function(field) {
            return formatValue(row[field]);
          }).join(delimiter);
        })).join("\n");
      }

      function formatRows(rows) {
        return rows.map(formatRow).join("\n");
      }

      function formatRow(row) {
        return row.map(formatValue).join(delimiter);
      }

      function formatValue(text) {
        return reFormat.test(text) ? "\"" + text.replace(/\"/g, "\"\"") + "\"" : text;
      }

      return {
        parse: parse,
        parseRows: parseRows,
        format: format,
        formatRows: formatRows
      };
    }

    var csv = _dsv(",");
    var tsv = _dsv("\t");

    function dispatch() {
      return new Dispatch(arguments);
    }

    function Dispatch(types) {
      var i = -1,
          n = types.length,
          callbacksByType = {},
          callbackByName = {},
          type,
          that = this;

      that.on = function(type, callback) {
        type = parseType(type);

        // Return the current callback, if any.
        if (arguments.length < 2) {
          return (callback = callbackByName[type.name]) && callback.value;
        }

        // If a type was specified…
        if (type.type) {
          var callbacks = callbacksByType[type.type],
              callback0 = callbackByName[type.name],
              i;

          // Remove the current callback, if any, using copy-on-remove.
          if (callback0) {
            callback0.value = null;
            i = callbacks.indexOf(callback0);
            callbacksByType[type.type] = callbacks = callbacks.slice(0, i).concat(callbacks.slice(i + 1));
            delete callbackByName[type.name];
          }

          // Add the new callback, if any.
          if (callback) {
            callback = {value: callback};
            callbackByName[type.name] = callback;
            callbacks.push(callback);
          }
        }

        // Otherwise, if a null callback was specified, remove all callbacks with the given name.
        else if (callback == null) {
          for (var otherType in callbacksByType) {
            if (callback = callbackByName[otherType + type.name]) {
              callback.value = null;
              var callbacks = callbacksByType[otherType], i = callbacks.indexOf(callback);
              callbacksByType[otherType] = callbacks.slice(0, i).concat(callbacks.slice(i + 1));
              delete callbackByName[callback.name];
            }
          }
        }

        return that;
      };

      while (++i < n) {
        type = types[i] + "";
        if (!type || (type in that)) throw new Error("illegal or duplicate type: " + type);
        callbacksByType[type] = [];
        that[type] = applier(type);
      }

      function parseType(type) {
        var i = (type += "").indexOf("."), name = type;
        if (i >= 0) type = type.slice(0, i); else name += ".";
        if (type && !callbacksByType.hasOwnProperty(type)) throw new Error("unknown type: " + type);
        return {type: type, name: name};
      }

      function applier(type) {
        return function() {
          var callbacks = callbacksByType[type], // Defensive reference; copy-on-remove.
              callback,
              callbackValue,
              i = -1,
              n = callbacks.length;

          while (++i < n) {
            if (callbackValue = (callback = callbacks[i]).value) {
              callbackValue.apply(this, arguments);
            }
          }

          return that;
        };
      }
    }

    dispatch.prototype = Dispatch.prototype;

    function xhr(url, callback) {
      var xhr,
          event = dispatch("beforesend", "progress", "load", "error"),
          mimeType,
          headers = new Map,
          request = new XMLHttpRequest,
          response,
          responseType;

      // If IE does not support CORS, use XDomainRequest.
      if (typeof XDomainRequest !== "undefined"
          && !("withCredentials" in request)
          && /^(http(s)?:)?\/\//.test(url)) request = new XDomainRequest;

      "onload" in request
          ? request.onload = request.onerror = respond
          : request.onreadystatechange = function() { request.readyState > 3 && respond(); };

      function respond() {
        var status = request.status, result;
        if (!status && hasResponse(request)
            || status >= 200 && status < 300
            || status === 304) {
          if (response) {
            try {
              result = response.call(xhr, request);
            } catch (e) {
              event.error.call(xhr, e);
              return;
            }
          } else {
            result = request;
          }
          event.load.call(xhr, result);
        } else {
          event.error.call(xhr, request);
        }
      }

      request.onprogress = function(e) {
        event.progress.call(xhr, e);
      };

      xhr = {
        header: function(name, value) {
          name = (name + "").toLowerCase();
          if (arguments.length < 2) return headers.get(name);
          if (value == null) headers.delete(name);
          else headers.set(name, value + "");
          return xhr;
        },

        // If mimeType is non-null and no Accept header is set, a default is used.
        mimeType: function(value) {
          if (!arguments.length) return mimeType;
          mimeType = value == null ? null : value + "";
          return xhr;
        },

        // Specifies what type the response value should take;
        // for instance, arraybuffer, blob, document, or text.
        responseType: function(value) {
          if (!arguments.length) return responseType;
          responseType = value;
          return xhr;
        },

        // Specify how to convert the response content to a specific type;
        // changes the callback value on "load" events.
        response: function(value) {
          response = value;
          return xhr;
        },

        // Alias for send("GET", …).
        get: function(data, callback) {
          return xhr.send("GET", data, callback);
        },

        // Alias for send("POST", …).
        post: function(data, callback) {
          return xhr.send("POST", data, callback);
        },

        // If callback is non-null, it will be used for error and load events.
        send: function(method, data, callback) {
          if (!callback && typeof data === "function") callback = data, data = null;
          if (callback && callback.length === 1) callback = fixCallback(callback);
          request.open(method, url, true);
          if (mimeType != null && !headers.has("accept")) headers.set("accept", mimeType + ",*/*");
          if (request.setRequestHeader) headers.forEach(function(value, name) { request.setRequestHeader(name, value); });
          if (mimeType != null && request.overrideMimeType) request.overrideMimeType(mimeType);
          if (responseType != null) request.responseType = responseType;
          if (callback) xhr.on("error", callback).on("load", function(request) { callback(null, request); });
          event.beforesend.call(xhr, request);
          request.send(data == null ? null : data);
          return xhr;
        },

        abort: function() {
          request.abort();
          return xhr;
        },

        on: function() {
          var value = event.on.apply(event, arguments);
          return value === event ? xhr : value;
        }
      };

      return callback
          ? xhr.get(callback)
          : xhr;
    }function fixCallback(callback) {
      return function(error, request) {
        callback(error == null ? request : null);
      };
    }

    function hasResponse(request) {
      var type = request.responseType;
      return type && type !== "text"
          ? request.response // null on error
          : request.responseText; // "" on error
    }

    function xhrDsv(defaultMimeType, dsv) {
      return function(url, row, callback) {
        if (arguments.length < 3) callback = row, row = null;
        var r = xhr(url).mimeType(defaultMimeType);
        r.row = function(_) { return arguments.length ? r.response(responseOf(dsv, row = _)) : row; };
        r.row(row);
        return callback ? r.get(callback) : r;
      };
    }function responseOf(dsv, row) {
      return function(request) {
        return dsv.parse(request.responseText, row);
      };
    }

    xhrDsv("text/tab-separated-values", tsv);

    xhrDsv("text/csv", csv);

    function xhrType(defaultMimeType, response) {
      return function(url, callback) {
        var r = xhr(url).mimeType(defaultMimeType).response(response);
        return callback ? r.get(callback) : r;
      };
    }

    var json = xhrType("application/json", function(request) {
      return JSON.parse(request.responseText);
    });

    function sum(array, f) {
      var s = 0,
          n = array.length,
          a,
          i = -1;

      if (arguments.length === 1) {
        while (++i < n) if (!isNaN(a = +array[i])) s += a; // Note: zero and null are equivalent.
      }

      else {
        while (++i < n) if (!isNaN(a = +f.call(array, array[i], i))) s += a;
      }

      return s;
    }

    function _range(start, stop, step) {
      if ((n = arguments.length) < 3) {
        step = 1;
        if (n < 2) {
          stop = start;
          start = 0;
        }
      }

      var i = -1,
          n = Math.max(0, Math.ceil((stop - start) / step)) | 0,
          k = _scale(Math.abs(step)),
          range = new Array(n);

      start *= k;
      step *= k;
      while (++i < n) {
        range[i] = (start + i * step) / k;
      }

      return range;
    }function _scale(x) {
      var k = 1;
      while (x * k % 1) k *= 10;
      return k;
    }

    // R-7 per <http://en.wikipedia.org/wiki/Quantile>
    function quantile(values, p) {
      var H = (values.length - 1) * p + 1,
          h = Math.floor(H),
          v = +values[h - 1],
          e = H - h;
      return e ? v + e * (values[h] - v) : v;
    }

    function _ascending(a, b) {
      return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
    }

    function descending(a, b) {
      return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
    }

    function bisector(compare) {
      if (compare.length === 1) compare = ascendingComparator(compare);
      return {
        left: function(a, x, lo, hi) {
          if (arguments.length < 3) lo = 0;
          if (arguments.length < 4) hi = a.length;
          while (lo < hi) {
            var mid = lo + hi >>> 1;
            if (compare(a[mid], x) < 0) lo = mid + 1;
            else hi = mid;
          }
          return lo;
        },
        right: function(a, x, lo, hi) {
          if (arguments.length < 3) lo = 0;
          if (arguments.length < 4) hi = a.length;
          while (lo < hi) {
            var mid = lo + hi >>> 1;
            if (compare(a[mid], x) > 0) hi = mid;
            else lo = mid + 1;
          }
          return lo;
        }
      };
    }function ascendingComparator(f) {
      return function(d, x) {
        return _ascending(f(d), x);
      };
    }

    var ascendingBisect = bisector(_ascending);
    var bisectRight = ascendingBisect.right;

    var enUs = {
      decimal: ".",
      thousands: ",",
      grouping: [3],
      currency: ["$", ""]
    };

    // Computes the decimal coefficient and exponent of the specified number x with
    // significant digits p, where x is positive and p is in [1, 21] or undefined.
    // For example, formatDecimal(1.23) returns ["123", 0].
    function formatDecimal(x, p) {
      if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
      var i, coefficient = x.slice(0, i);

      // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
      // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
      return [
        coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
        +x.slice(i + 1)
      ];
    }

    function _exponent(x) {
      return x = formatDecimal(Math.abs(x)), x ? x[1] : NaN;
    }

    var prefixExponent;

    function formatPrefixAuto(x, p) {
      var d = formatDecimal(x, p);
      if (!d) return x + "";
      var coefficient = d[0],
          exponent = d[1],
          i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
          n = coefficient.length;
      return i === n ? coefficient
          : i > n ? coefficient + new Array(i - n + 1).join("0")
          : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
          : "0." + new Array(1 - i).join("0") + formatDecimal(x, p + i - 1)[0]; // less than 1y!
    }

    function formatRounded(x, p) {
      var d = formatDecimal(x, p);
      if (!d) return x + "";
      var coefficient = d[0],
          exponent = d[1];
      return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
          : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
          : coefficient + new Array(exponent - coefficient.length + 2).join("0");
    }

    function formatDefault(x, p) {
      x = x.toPrecision(p);

      out: for (var n = x.length, i = 1, i0 = -1, i1; i < n; ++i) {
        switch (x[i]) {
          case ".": i0 = i1 = i; break;
          case "0": if (i0 === 0) i0 = i; i1 = i; break;
          case "e": break out;
          default: if (i0 > 0) i0 = 0; break;
        }
      }

      return i0 > 0 ? x.slice(0, i0) + x.slice(i1 + 1) : x;
    }

    var formatTypes = {
      "": formatDefault,
      "%": function(x, p) { return (x * 100).toFixed(p); },
      "b": function(x) { return Math.round(x).toString(2); },
      "c": function(x) { return x + ""; },
      "d": function(x) { return Math.round(x).toString(10); },
      "e": function(x, p) { return x.toExponential(p); },
      "f": function(x, p) { return x.toFixed(p); },
      "g": function(x, p) { return x.toPrecision(p); },
      "o": function(x) { return Math.round(x).toString(8); },
      "p": function(x, p) { return formatRounded(x * 100, p); },
      "r": formatRounded,
      "s": formatPrefixAuto,
      "X": function(x) { return Math.round(x).toString(16).toUpperCase(); },
      "x": function(x) { return Math.round(x).toString(16); }
    };

    // [[fill]align][sign][symbol][0][width][,][.precision][type]
    var re = /^(?:(.)?([<>=^]))?([+\-\( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?([a-z%])?$/i;

    function formatSpecifier(specifier) {
      return new FormatSpecifier(specifier);
    }function FormatSpecifier(specifier) {
      if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);

      var match,
          fill = match[1] || " ",
          align = match[2] || ">",
          sign = match[3] || "-",
          symbol = match[4] || "",
          zero = !!match[5],
          width = match[6] && +match[6],
          comma = !!match[7],
          precision = match[8] && +match[8].slice(1),
          type = match[9] || "";

      // The "n" type is an alias for ",g".
      if (type === "n") comma = true, type = "g";

      // Map invalid types to the default format.
      else if (!formatTypes[type]) type = "";

      // If zero fill is specified, padding goes after sign and before digits.
      if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

      this.fill = fill;
      this.align = align;
      this.sign = sign;
      this.symbol = symbol;
      this.zero = zero;
      this.width = width;
      this.comma = comma;
      this.precision = precision;
      this.type = type;
    }

    FormatSpecifier.prototype.toString = function() {
      return this.fill
          + this.align
          + this.sign
          + this.symbol
          + (this.zero ? "0" : "")
          + (this.width == null ? "" : Math.max(1, this.width | 0))
          + (this.comma ? "," : "")
          + (this.precision == null ? "" : "." + Math.max(0, this.precision | 0))
          + this.type;
    };

    function formatGroup(grouping, thousands) {
      return function(value, width) {
        var i = value.length,
            t = [],
            j = 0,
            g = grouping[0],
            length = 0;

        while (i > 0 && g > 0) {
          if (length + g + 1 > width) g = Math.max(1, width - length);
          t.push(value.substring(i -= g, i + g));
          if ((length += g + 1) > width) break;
          g = grouping[j = (j + 1) % grouping.length];
        }

        return t.reverse().join(thousands);
      };
    }

    var prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

    function _identity(x) {
      return x;
    }

    function _locale(locale) {
      var group = locale.grouping && locale.thousands ? formatGroup(locale.grouping, locale.thousands) : _identity,
          currency = locale.currency,
          decimal = locale.decimal;

      function format(specifier) {
        specifier = formatSpecifier(specifier);

        var fill = specifier.fill,
            align = specifier.align,
            sign = specifier.sign,
            symbol = specifier.symbol,
            zero = specifier.zero,
            width = specifier.width,
            comma = specifier.comma,
            precision = specifier.precision,
            type = specifier.type;

        // Compute the prefix and suffix.
        // For SI-prefix, the suffix is lazily computed.
        var prefix = symbol === "$" ? currency[0] : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
            suffix = symbol === "$" ? currency[1] : /[%p]/.test(type) ? "%" : "";

        // What format function should we use?
        // Is this an integer type?
        // Can this type generate exponential notation?
        var formatType = formatTypes[type],
            maybeSuffix = !type || /[defgprs%]/.test(type);

        // Set the default precision if not specified,
        // or clamp the specified precision to the supported range.
        // For significant precision, it must be in [1, 21].
        // For fixed precision, it must be in [0, 20].
        precision = precision == null ? (type ? 6 : 12)
            : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
            : Math.max(0, Math.min(20, precision));

        return function(value) {
          var valuePrefix = prefix,
              valueSuffix = suffix;

          if (type === "c") {
            valueSuffix = formatType(value) + valueSuffix;
            value = "";
          } else {
            value = +value;

            // Convert negative to positive, and compute the prefix.
            // Note that -0 is not less than 0, but 1 / -0 is!
            var valueNegative = (value < 0 || 1 / value < 0) && (value *= -1, true);

            // Perform the initial formatting.
            value = formatType(value, precision);

            // Compute the prefix and suffix.
            valuePrefix = (valueNegative ? (sign === "(" ? sign : "-") : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
            valueSuffix = valueSuffix + (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + (valueNegative && sign === "(" ? ")" : "");

            // Break the formatted value into the integer “value” part that can be
            // grouped, and fractional or exponential “suffix” part that is not.
            if (maybeSuffix) {
              var i = -1, n = value.length, c;
              while (++i < n) {
                if (c = value.charCodeAt(i), 48 > c || c > 57) {
                  valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
                  value = value.slice(0, i);
                  break;
                }
              }
            }
          }

          // If the fill character is not "0", grouping is applied before padding.
          if (comma && !zero) value = group(value, Infinity);

          // Compute the padding.
          var length = valuePrefix.length + value.length + valueSuffix.length,
              padding = length < width ? new Array(width - length + 1).join(fill) : "";

          // If the fill character is "0", grouping is applied after padding.
          if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

          // Reconstruct the final output based on the desired alignment.
          switch (align) {
            case "<": return valuePrefix + value + valueSuffix + padding;
            case "=": return valuePrefix + padding + value + valueSuffix;
            case "^": return padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length);
          }
          return padding + valuePrefix + value + valueSuffix;
        };
      }

      function formatPrefix(specifier, value) {
        var f = format((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
            e = Math.max(-8, Math.min(8, Math.floor(_exponent(value) / 3))) * 3,
            k = Math.pow(10, -e),
            prefix = prefixes[8 + e / 3];
        return function(value) {
          return f(k * value) + prefix;
        };
      }

      return {
        format: format,
        formatPrefix: formatPrefix
      };
    }

    function precisionRound(step, max) {
      return Math.max(0, _exponent(Math.abs(max)) - _exponent(Math.abs(step))) + 1;
    }

    function precisionPrefix(step, value) {
      return Math.max(0, Math.max(-8, Math.min(8, Math.floor(_exponent(value) / 3))) * 3 - _exponent(Math.abs(step)));
    }

    function precisionFixed(step) {
      return Math.max(0, -_exponent(Math.abs(step)));
    }

    var _defaultLocale = _locale(enUs);
    var ___format = _defaultLocale.format;
    var formatPrefix = _defaultLocale.formatPrefix;

    var _enUs = {
      dateTime: "%a %b %e %X %Y",
      date: "%m/%d/%Y",
      time: "%H:%M:%S",
      periods: ["AM", "PM"],
      days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    };

    var _t0 = new Date;
    var _t1 = new Date;
    function newInterval(floori, offseti, count) {

      function interval(date) {
        return floori(date = new Date(+date)), date;
      }

      interval.floor = interval;

      interval.round = function(date) {
        var d0 = new Date(+date),
            d1 = new Date(date - 1);
        floori(d0), floori(d1), offseti(d1, 1);
        return date - d0 < d1 - date ? d0 : d1;
      };

      interval.ceil = function(date) {
        return floori(date = new Date(date - 1)), offseti(date, 1), date;
      };

      interval.offset = function(date, step) {
        return offseti(date = new Date(+date), step == null ? 1 : Math.floor(step)), date;
      };

      interval.range = function(start, stop, step) {
        var range = [];
        start = new Date(start - 1);
        stop = new Date(+stop);
        step = step == null ? 1 : Math.floor(step);
        if (!(start < stop) || !(step > 0)) return range; // also handles Invalid Date
        offseti(start, 1), floori(start);
        if (start < stop) range.push(new Date(+start));
        while (offseti(start, step), floori(start), start < stop) range.push(new Date(+start));
        return range;
      };

      interval.filter = function(test) {
        return newInterval(function(date) {
          while (floori(date), !test(date)) date.setTime(date - 1);
        }, function(date, step) {
          while (--step >= 0) while (offseti(date, 1), !test(date));
        });
      };

      if (count) interval.count = function(start, end) {
        _t0.setTime(+start), _t1.setTime(+end);
        floori(_t0), floori(_t1);
        return Math.floor(count(_t0, _t1));
      };

      return interval;
    }

    var second = newInterval(function(date) {
      date.setMilliseconds(0);
    }, function(date, step) {
      date.setTime(+date + step * 1e3);
    }, function(start, end) {
      return (end - start) / 1e3;
    });

    var minute = newInterval(function(date) {
      date.setSeconds(0, 0);
    }, function(date, step) {
      date.setTime(+date + step * 6e4);
    }, function(start, end) {
      return (end - start) / 6e4;
    });

    var hour = newInterval(function(date) {
      date.setMinutes(0, 0, 0);
    }, function(date, step) {
      date.setTime(+date + step * 36e5);
    }, function(start, end) {
      return (end - start) / 36e5;
    });

    var day = newInterval(function(date) {
      date.setHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setDate(date.getDate() + step);
    }, function(start, end) {
      return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * 6e4) / 864e5;
    });

    function weekday(i) {
      return newInterval(function(date) {
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
      }, function(date, step) {
        date.setDate(date.getDate() + step * 7);
      }, function(start, end) {
        return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * 6e4) / 6048e5;
      });
    }

    var sunday = weekday(0);
    var monday = weekday(1);

    var month = newInterval(function(date) {
      date.setHours(0, 0, 0, 0);
      date.setDate(1);
    }, function(date, step) {
      date.setMonth(date.getMonth() + step);
    }, function(start, end) {
      return end.getMonth() - start.getMonth() + (end.getFullYear() - start.getFullYear()) * 12;
    });

    var year = newInterval(function(date) {
      date.setHours(0, 0, 0, 0);
      date.setMonth(0, 1);
    }, function(date, step) {
      date.setFullYear(date.getFullYear() + step);
    }, function(start, end) {
      return end.getFullYear() - start.getFullYear();
    });

    var utcSecond = newInterval(function(date) {
      date.setUTCMilliseconds(0);
    }, function(date, step) {
      date.setTime(+date + step * 1e3);
    }, function(start, end) {
      return (end - start) / 1e3;
    });

    var utcMinute = newInterval(function(date) {
      date.setUTCSeconds(0, 0);
    }, function(date, step) {
      date.setTime(+date + step * 6e4);
    }, function(start, end) {
      return (end - start) / 6e4;
    });

    var utcHour = newInterval(function(date) {
      date.setUTCMinutes(0, 0, 0);
    }, function(date, step) {
      date.setTime(+date + step * 36e5);
    }, function(start, end) {
      return (end - start) / 36e5;
    });

    var utcDay = newInterval(function(date) {
      date.setUTCHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setUTCDate(date.getUTCDate() + step);
    }, function(start, end) {
      return (end - start) / 864e5;
    });

    function utcWeekday(i) {
      return newInterval(function(date) {
        date.setUTCHours(0, 0, 0, 0);
        date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 7 - i) % 7);
      }, function(date, step) {
        date.setUTCDate(date.getUTCDate() + step * 7);
      }, function(start, end) {
        return (end - start) / 6048e5;
      });
    }

    var utcSunday = utcWeekday(0);
    var utcMonday = utcWeekday(1);

    var utcMonth = newInterval(function(date) {
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(1);
    }, function(date, step) {
      date.setUTCMonth(date.getUTCMonth() + step);
    }, function(start, end) {
      return end.getUTCMonth() - start.getUTCMonth() + (end.getUTCFullYear() - start.getUTCFullYear()) * 12;
    });

    var utcYear = newInterval(function(date) {
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCMonth(0, 1);
    }, function(date, step) {
      date.setUTCFullYear(date.getUTCFullYear() + step);
    }, function(start, end) {
      return end.getUTCFullYear() - start.getUTCFullYear();
    });

    function localDate(d) {
      if (0 <= d.y && d.y < 100) {
        var date = new Date(-1, d.m, d.d, d.H, d.M, d.S, d.L);
        date.setFullYear(d.y);
        return date;
      }
      return new Date(d.y, d.m, d.d, d.H, d.M, d.S, d.L);
    }

    function utcDate(d) {
      if (0 <= d.y && d.y < 100) {
        var date = new Date(Date.UTC(-1, d.m, d.d, d.H, d.M, d.S, d.L));
        date.setUTCFullYear(d.y);
        return date;
      }
      return new Date(Date.UTC(d.y, d.m, d.d, d.H, d.M, d.S, d.L));
    }

    function newYear(y) {
      return {y: y, m: 0, d: 1, H: 0, M: 0, S: 0, L: 0};
    }

    function __locale(locale) {
      var locale_dateTime = locale.dateTime,
          locale_date = locale.date,
          locale_time = locale.time,
          locale_periods = locale.periods,
          locale_weekdays = locale.days,
          locale_shortWeekdays = locale.shortDays,
          locale_months = locale.months,
          locale_shortMonths = locale.shortMonths;

      var periodLookup = formatLookup(locale_periods),
          weekdayRe = formatRe(locale_weekdays),
          weekdayLookup = formatLookup(locale_weekdays),
          shortWeekdayRe = formatRe(locale_shortWeekdays),
          shortWeekdayLookup = formatLookup(locale_shortWeekdays),
          monthRe = formatRe(locale_months),
          monthLookup = formatLookup(locale_months),
          shortMonthRe = formatRe(locale_shortMonths),
          shortMonthLookup = formatLookup(locale_shortMonths);

      var formats = {
        "a": formatShortWeekday,
        "A": formatWeekday,
        "b": formatShortMonth,
        "B": formatMonth,
        "c": null,
        "d": formatDayOfMonth,
        "e": formatDayOfMonth,
        "H": formatHour24,
        "I": formatHour12,
        "j": formatDayOfYear,
        "L": formatMilliseconds,
        "m": formatMonthNumber,
        "M": formatMinutes,
        "p": formatPeriod,
        "S": formatSeconds,
        "U": formatWeekNumberSunday,
        "w": formatWeekdayNumber,
        "W": formatWeekNumberMonday,
        "x": null,
        "X": null,
        "y": _formatYear,
        "Y": formatFullYear,
        "Z": formatZone,
        "%": formatLiteralPercent
      };

      var utcFormats = {
        "a": formatUTCShortWeekday,
        "A": formatUTCWeekday,
        "b": formatUTCShortMonth,
        "B": formatUTCMonth,
        "c": null,
        "d": formatUTCDayOfMonth,
        "e": formatUTCDayOfMonth,
        "H": formatUTCHour24,
        "I": formatUTCHour12,
        "j": formatUTCDayOfYear,
        "L": formatUTCMilliseconds,
        "m": formatUTCMonthNumber,
        "M": formatUTCMinutes,
        "p": formatUTCPeriod,
        "S": formatUTCSeconds,
        "U": formatUTCWeekNumberSunday,
        "w": formatUTCWeekdayNumber,
        "W": formatUTCWeekNumberMonday,
        "x": null,
        "X": null,
        "y": _formatUTCYear,
        "Y": formatUTCFullYear,
        "Z": formatUTCZone,
        "%": formatLiteralPercent
      };

      var parses = {
        "a": parseShortWeekday,
        "A": parseWeekday,
        "b": parseShortMonth,
        "B": parseMonth,
        "c": parseLocaleDateTime,
        "d": parseDayOfMonth,
        "e": parseDayOfMonth,
        "H": parseHour24,
        "I": parseHour24,
        "j": parseDayOfYear,
        "L": parseMilliseconds,
        "m": parseMonthNumber,
        "M": parseMinutes,
        "p": parsePeriod,
        "S": parseSeconds,
        "U": parseWeekNumberSunday,
        "w": parseWeekdayNumber,
        "W": parseWeekNumberMonday,
        "x": parseLocaleDate,
        "X": parseLocaleTime,
        "y": parseYear,
        "Y": parseFullYear,
        "Z": parseZone,
        "%": parseLiteralPercent
      };

      // These recursive directive definitions must be deferred.
      formats.x = newFormat(locale_date, formats);
      formats.X = newFormat(locale_time, formats);
      formats.c = newFormat(locale_dateTime, formats);
      utcFormats.x = newFormat(locale_date, utcFormats);
      utcFormats.X = newFormat(locale_time, utcFormats);
      utcFormats.c = newFormat(locale_dateTime, utcFormats);

      function newFormat(specifier, formats) {
        return function(date) {
          var string = [],
              i = -1,
              j = 0,
              n = specifier.length,
              c,
              pad,
              format;

          while (++i < n) {
            if (specifier.charCodeAt(i) === 37) {
              string.push(specifier.slice(j, i));
              if ((pad = pads[c = specifier.charAt(++i)]) != null) c = specifier.charAt(++i);
              if (format = formats[c]) c = format(date, pad == null ? (c === "e" ? " " : "0") : pad);
              string.push(c);
              j = i + 1;
            }
          }

          string.push(specifier.slice(j, i));
          return string.join("");
        };
      }

      function newParse(specifier, newDate) {
        return function(string) {
          var d = newYear(1900),
              i = parseSpecifier(d, specifier, string, 0);
          if (i != string.length) return null;

          // The am-pm flag is 0 for AM, and 1 for PM.
          if ("p" in d) d.H = d.H % 12 + d.p * 12;

          // If a time zone is specified, all fields are interpreted as UTC and then
          // offset according to the specified time zone.
          if ("Z" in d) {
            if ("w" in d && ("W" in d || "U" in d)) {
              var day = utcDate(newYear(d.y)).getUTCDay();
              if ("W" in d) d.U = d.W, d.w = (d.w + 6) % 7, --day;
              d.m = 0;
              d.d = d.w + d.U * 7 - (day + 6) % 7;
            }
            d.H += d.Z / 100 | 0;
            d.M += d.Z % 100;
            return utcDate(d);
          }

          // Otherwise, all fields are in local time.
          if ("w" in d && ("W" in d || "U" in d)) {
            var day = newDate(newYear(d.y)).getDay();
            if ("W" in d) d.U = d.W, d.w = (d.w + 6) % 7, --day;
            d.m = 0;
            d.d = d.w + d.U * 7 - (day + 6) % 7;
          }
          return newDate(d);
        };
      }

      function parseSpecifier(d, specifier, string, j) {
        var i = 0,
            n = specifier.length,
            m = string.length,
            c,
            parse;

        while (i < n) {
          if (j >= m) return -1;
          c = specifier.charCodeAt(i++);
          if (c === 37) {
            c = specifier.charAt(i++);
            parse = parses[c in pads ? specifier.charAt(i++) : c];
            if (!parse || ((j = parse(d, string, j)) < 0)) return -1;
          } else if (c != string.charCodeAt(j++)) {
            return -1;
          }
        }

        return j;
      }

      function parseShortWeekday(d, string, i) {
        var n = shortWeekdayRe.exec(string.slice(i));
        return n ? (d.w = shortWeekdayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
      }

      function parseWeekday(d, string, i) {
        var n = weekdayRe.exec(string.slice(i));
        return n ? (d.w = weekdayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
      }

      function parseShortMonth(d, string, i) {
        var n = shortMonthRe.exec(string.slice(i));
        return n ? (d.m = shortMonthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
      }

      function parseMonth(d, string, i) {
        var n = monthRe.exec(string.slice(i));
        return n ? (d.m = monthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
      }

      function parseLocaleDateTime(d, string, i) {
        return parseSpecifier(d, locale_dateTime, string, i);
      }

      function parseLocaleDate(d, string, i) {
        return parseSpecifier(d, locale_date, string, i);
      }

      function parseLocaleTime(d, string, i) {
        return parseSpecifier(d, locale_time, string, i);
      }

      function parsePeriod(d, string, i) {
        var n = periodLookup.get(string.slice(i, i += 2).toLowerCase());
        return n == null ? -1 : (d.p = n, i);
      }

      function formatShortWeekday(d) {
        return locale_shortWeekdays[d.getDay()];
      }

      function formatWeekday(d) {
        return locale_weekdays[d.getDay()];
      }

      function formatShortMonth(d) {
        return locale_shortMonths[d.getMonth()];
      }

      function formatMonth(d) {
        return locale_months[d.getMonth()];
      }

      function formatPeriod(d) {
        return locale_periods[+(d.getHours() >= 12)];
      }

      function formatUTCShortWeekday(d) {
        return locale_shortWeekdays[d.getUTCDay()];
      }

      function formatUTCWeekday(d) {
        return locale_weekdays[d.getUTCDay()];
      }

      function formatUTCShortMonth(d) {
        return locale_shortMonths[d.getUTCMonth()];
      }

      function formatUTCMonth(d) {
        return locale_months[d.getUTCMonth()];
      }

      function formatUTCPeriod(d) {
        return locale_periods[+(d.getUTCHours() >= 12)];
      }

      return {
        format: function(specifier) {
          var f = newFormat(specifier += "", formats);
          f.parse = newParse(specifier, localDate);
          f.toString = function() { return specifier; };
          return f;
        },
        utcFormat: function(specifier) {
          var f = newFormat(specifier += "", utcFormats);
          f.parse = newParse(specifier, utcDate);
          f.toString = function() { return specifier; };
          return f;
        }
      };
    }var pads = {"-": "", "_": " ", "0": "0"};
    var numberRe = /^\s*\d+/;
    var percentRe = /^%/;
    var _requoteRe = /[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;
    function pad(value, fill, width) {
      var sign = value < 0 ? "-" : "",
          string = (sign ? -value : value) + "",
          length = string.length;
      return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
    }

    function requote(s) {
      return s.replace(_requoteRe, "\\$&");
    }

    function formatRe(names) {
      return new RegExp("^(?:" + names.map(requote).join("|") + ")", "i");
    }

    function formatLookup(names) {
      var map = new Map, i = -1, n = names.length;
      while (++i < n) map.set(names[i].toLowerCase(), i);
      return map;
    }

    function parseWeekdayNumber(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 1));
      return n ? (d.w = +n[0], i + n[0].length) : -1;
    }

    function parseWeekNumberSunday(d, string, i) {
      var n = numberRe.exec(string.slice(i));
      return n ? (d.U = +n[0], i + n[0].length) : -1;
    }

    function parseWeekNumberMonday(d, string, i) {
      var n = numberRe.exec(string.slice(i));
      return n ? (d.W = +n[0], i + n[0].length) : -1;
    }

    function parseFullYear(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 4));
      return n ? (d.y = +n[0], i + n[0].length) : -1;
    }

    function parseYear(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.y = +n[0] + (+n[0] > 68 ? 1900 : 2000), i + n[0].length) : -1;
    }

    function parseZone(d, string, i) {
      return /^[+-]\d{4}$/.test(string = string.slice(i, i + 5))
          ? (d.Z = -string, i + 5) // sign differs from getTimezoneOffset!
          : -1;
    }

    function parseMonthNumber(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.m = n[0] - 1, i + n[0].length) : -1;
    }

    function parseDayOfMonth(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.d = +n[0], i + n[0].length) : -1;
    }

    function parseDayOfYear(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 3));
      return n ? (d.m = 0, d.d = +n[0], i + n[0].length) : -1;
    }

    function parseHour24(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.H = +n[0], i + n[0].length) : -1;
    }

    function parseMinutes(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.M = +n[0], i + n[0].length) : -1;
    }

    function parseSeconds(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 2));
      return n ? (d.S = +n[0], i + n[0].length) : -1;
    }

    function parseMilliseconds(d, string, i) {
      var n = numberRe.exec(string.slice(i, i + 3));
      return n ? (d.L = +n[0], i + n[0].length) : -1;
    }

    function parseLiteralPercent(d, string, i) {
      var n = percentRe.exec(string.slice(i, i + 1));
      return n ? i + n[0].length : -1;
    }

    function formatDayOfMonth(d, p) {
      return pad(d.getDate(), p, 2);
    }

    function formatHour24(d, p) {
      return pad(d.getHours(), p, 2);
    }

    function formatHour12(d, p) {
      return pad(d.getHours() % 12 || 12, p, 2);
    }

    function formatDayOfYear(d, p) {
      return pad(1 + day.count(year(d), d), p, 3);
    }

    function formatMilliseconds(d, p) {
      return pad(d.getMilliseconds(), p, 3);
    }

    function formatMonthNumber(d, p) {
      return pad(d.getMonth() + 1, p, 2);
    }

    function formatMinutes(d, p) {
      return pad(d.getMinutes(), p, 2);
    }

    function formatSeconds(d, p) {
      return pad(d.getSeconds(), p, 2);
    }

    function formatWeekNumberSunday(d, p) {
      return pad(sunday.count(year(d), d), p, 2);
    }

    function formatWeekdayNumber(d) {
      return d.getDay();
    }

    function formatWeekNumberMonday(d, p) {
      return pad(monday.count(year(d), d), p, 2);
    }

    function _formatYear(d, p) {
      return pad(d.getFullYear() % 100, p, 2);
    }

    function formatFullYear(d, p) {
      return pad(d.getFullYear() % 10000, p, 4);
    }

    function formatZone(d) {
      var z = d.getTimezoneOffset();
      return (z > 0 ? "-" : (z *= -1, "+"))
          + pad(z / 60 | 0, "0", 2)
          + pad(z % 60, "0", 2);
    }

    function formatUTCDayOfMonth(d, p) {
      return pad(d.getUTCDate(), p, 2);
    }

    function formatUTCHour24(d, p) {
      return pad(d.getUTCHours(), p, 2);
    }

    function formatUTCHour12(d, p) {
      return pad(d.getUTCHours() % 12 || 12, p, 2);
    }

    function formatUTCDayOfYear(d, p) {
      return pad(1 + utcDay.count(utcYear(d), d), p, 3);
    }

    function formatUTCMilliseconds(d, p) {
      return pad(d.getUTCMilliseconds(), p, 3);
    }

    function formatUTCMonthNumber(d, p) {
      return pad(d.getUTCMonth() + 1, p, 2);
    }

    function formatUTCMinutes(d, p) {
      return pad(d.getUTCMinutes(), p, 2);
    }

    function formatUTCSeconds(d, p) {
      return pad(d.getUTCSeconds(), p, 2);
    }

    function formatUTCWeekNumberSunday(d, p) {
      return pad(utcSunday.count(utcYear(d), d), p, 2);
    }

    function formatUTCWeekdayNumber(d) {
      return d.getUTCDay();
    }

    function formatUTCWeekNumberMonday(d, p) {
      return pad(utcMonday.count(utcYear(d), d), p, 2);
    }

    function _formatUTCYear(d, p) {
      return pad(d.getUTCFullYear() % 100, p, 2);
    }

    function formatUTCFullYear(d, p) {
      return pad(d.getUTCFullYear() % 10000, p, 4);
    }

    function formatUTCZone() {
      return "+0000";
    }

    function formatLiteralPercent() {
      return "%";
    }

    var defaultLocale = __locale(_enUs);
    var __format = defaultLocale.format;
    var utcFormat = defaultLocale.utcFormat;

    function interpolateNumber(a, b) {
      return a = +a, b -= a, function(t) {
        return a + b * t;
      };
    }

    function interpolate(a, b) {
      var i = interpolators.length, f;
      while (--i >= 0 && !(f = interpolators[i](a, b)));
      return f;
    }

    function interpolateObject(a, b) {
      var i = {},
          c = {},
          k;

      for (k in a) {
        if (k in b) {
          i[k] = interpolate(a[k], b[k]);
        } else {
          c[k] = a[k];
        }
      }

      for (k in b) {
        if (!(k in a)) {
          c[k] = b[k];
        }
      }

      return function(t) {
        for (k in i) c[k] = i[k](t);
        return c;
      };
    }

    // TODO sparse arrays?
    function interpolateArray(a, b) {
      var x = [],
          c = [],
          na = a.length,
          nb = b.length,
          n0 = Math.min(a.length, b.length),
          i;

      for (i = 0; i < n0; ++i) x.push(interpolate(a[i], b[i]));
      for (; i < na; ++i) c[i] = a[i];
      for (; i < nb; ++i) c[i] = b[i];

      return function(t) {
        for (i = 0; i < n0; ++i) c[i] = x[i](t);
        return c;
      };
    }

    function Color() {}var reHex3 = /^#([0-9a-f]{3})$/;
    var reHex6 = /^#([0-9a-f]{6})$/;
    var reRgbInteger = /^rgb\(\s*([-+]?\d+)\s*,\s*([-+]?\d+)\s*,\s*([-+]?\d+)\s*\)$/;
    var reRgbPercent = /^rgb\(\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*\)$/;
    var reHslPercent = /^hsl\(\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*\)$/;
    color.prototype = Color.prototype = {
      displayable: function() {
        return this.rgb().displayable();
      },
      toString: function() {
        return this.rgb() + "";
      }
    };

    function color(format) {
      var m;
      format = (format + "").trim().toLowerCase();
      return (m = reHex3.exec(format)) ? (m = parseInt(m[1], 16), rgb((m >> 8 & 0xf) | (m >> 4 & 0x0f0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf))) // #f00
          : (m = reHex6.exec(format)) ? rgbn(parseInt(m[1], 16)) // #ff0000
          : (m = reRgbInteger.exec(format)) ? rgb(m[1], m[2], m[3]) // rgb(255,0,0)
          : (m = reRgbPercent.exec(format)) ? rgb(m[1] * 2.55, m[2] * 2.55, m[3] * 2.55) // rgb(100%,0%,0%)
          : (m = reHslPercent.exec(format)) ? hsl(m[1], m[2] * .01, m[3] * .01) // hsl(120,50%,50%)
          : named.has(format) ? rgbn(named.get(format))
          : null;
    }function rgbn(n) {
      return rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff);
    }

    var named = (new Map)
        .set("aliceblue", 0xf0f8ff)
        .set("antiquewhite", 0xfaebd7)
        .set("aqua", 0x00ffff)
        .set("aquamarine", 0x7fffd4)
        .set("azure", 0xf0ffff)
        .set("beige", 0xf5f5dc)
        .set("bisque", 0xffe4c4)
        .set("black", 0x000000)
        .set("blanchedalmond", 0xffebcd)
        .set("blue", 0x0000ff)
        .set("blueviolet", 0x8a2be2)
        .set("brown", 0xa52a2a)
        .set("burlywood", 0xdeb887)
        .set("cadetblue", 0x5f9ea0)
        .set("chartreuse", 0x7fff00)
        .set("chocolate", 0xd2691e)
        .set("coral", 0xff7f50)
        .set("cornflowerblue", 0x6495ed)
        .set("cornsilk", 0xfff8dc)
        .set("crimson", 0xdc143c)
        .set("cyan", 0x00ffff)
        .set("darkblue", 0x00008b)
        .set("darkcyan", 0x008b8b)
        .set("darkgoldenrod", 0xb8860b)
        .set("darkgray", 0xa9a9a9)
        .set("darkgreen", 0x006400)
        .set("darkgrey", 0xa9a9a9)
        .set("darkkhaki", 0xbdb76b)
        .set("darkmagenta", 0x8b008b)
        .set("darkolivegreen", 0x556b2f)
        .set("darkorange", 0xff8c00)
        .set("darkorchid", 0x9932cc)
        .set("darkred", 0x8b0000)
        .set("darksalmon", 0xe9967a)
        .set("darkseagreen", 0x8fbc8f)
        .set("darkslateblue", 0x483d8b)
        .set("darkslategray", 0x2f4f4f)
        .set("darkslategrey", 0x2f4f4f)
        .set("darkturquoise", 0x00ced1)
        .set("darkviolet", 0x9400d3)
        .set("deeppink", 0xff1493)
        .set("deepskyblue", 0x00bfff)
        .set("dimgray", 0x696969)
        .set("dimgrey", 0x696969)
        .set("dodgerblue", 0x1e90ff)
        .set("firebrick", 0xb22222)
        .set("floralwhite", 0xfffaf0)
        .set("forestgreen", 0x228b22)
        .set("fuchsia", 0xff00ff)
        .set("gainsboro", 0xdcdcdc)
        .set("ghostwhite", 0xf8f8ff)
        .set("gold", 0xffd700)
        .set("goldenrod", 0xdaa520)
        .set("gray", 0x808080)
        .set("green", 0x008000)
        .set("greenyellow", 0xadff2f)
        .set("grey", 0x808080)
        .set("honeydew", 0xf0fff0)
        .set("hotpink", 0xff69b4)
        .set("indianred", 0xcd5c5c)
        .set("indigo", 0x4b0082)
        .set("ivory", 0xfffff0)
        .set("khaki", 0xf0e68c)
        .set("lavender", 0xe6e6fa)
        .set("lavenderblush", 0xfff0f5)
        .set("lawngreen", 0x7cfc00)
        .set("lemonchiffon", 0xfffacd)
        .set("lightblue", 0xadd8e6)
        .set("lightcoral", 0xf08080)
        .set("lightcyan", 0xe0ffff)
        .set("lightgoldenrodyellow", 0xfafad2)
        .set("lightgray", 0xd3d3d3)
        .set("lightgreen", 0x90ee90)
        .set("lightgrey", 0xd3d3d3)
        .set("lightpink", 0xffb6c1)
        .set("lightsalmon", 0xffa07a)
        .set("lightseagreen", 0x20b2aa)
        .set("lightskyblue", 0x87cefa)
        .set("lightslategray", 0x778899)
        .set("lightslategrey", 0x778899)
        .set("lightsteelblue", 0xb0c4de)
        .set("lightyellow", 0xffffe0)
        .set("lime", 0x00ff00)
        .set("limegreen", 0x32cd32)
        .set("linen", 0xfaf0e6)
        .set("magenta", 0xff00ff)
        .set("maroon", 0x800000)
        .set("mediumaquamarine", 0x66cdaa)
        .set("mediumblue", 0x0000cd)
        .set("mediumorchid", 0xba55d3)
        .set("mediumpurple", 0x9370db)
        .set("mediumseagreen", 0x3cb371)
        .set("mediumslateblue", 0x7b68ee)
        .set("mediumspringgreen", 0x00fa9a)
        .set("mediumturquoise", 0x48d1cc)
        .set("mediumvioletred", 0xc71585)
        .set("midnightblue", 0x191970)
        .set("mintcream", 0xf5fffa)
        .set("mistyrose", 0xffe4e1)
        .set("moccasin", 0xffe4b5)
        .set("navajowhite", 0xffdead)
        .set("navy", 0x000080)
        .set("oldlace", 0xfdf5e6)
        .set("olive", 0x808000)
        .set("olivedrab", 0x6b8e23)
        .set("orange", 0xffa500)
        .set("orangered", 0xff4500)
        .set("orchid", 0xda70d6)
        .set("palegoldenrod", 0xeee8aa)
        .set("palegreen", 0x98fb98)
        .set("paleturquoise", 0xafeeee)
        .set("palevioletred", 0xdb7093)
        .set("papayawhip", 0xffefd5)
        .set("peachpuff", 0xffdab9)
        .set("peru", 0xcd853f)
        .set("pink", 0xffc0cb)
        .set("plum", 0xdda0dd)
        .set("powderblue", 0xb0e0e6)
        .set("purple", 0x800080)
        .set("rebeccapurple", 0x663399)
        .set("red", 0xff0000)
        .set("rosybrown", 0xbc8f8f)
        .set("royalblue", 0x4169e1)
        .set("saddlebrown", 0x8b4513)
        .set("salmon", 0xfa8072)
        .set("sandybrown", 0xf4a460)
        .set("seagreen", 0x2e8b57)
        .set("seashell", 0xfff5ee)
        .set("sienna", 0xa0522d)
        .set("silver", 0xc0c0c0)
        .set("skyblue", 0x87ceeb)
        .set("slateblue", 0x6a5acd)
        .set("slategray", 0x708090)
        .set("slategrey", 0x708090)
        .set("snow", 0xfffafa)
        .set("springgreen", 0x00ff7f)
        .set("steelblue", 0x4682b4)
        .set("tan", 0xd2b48c)
        .set("teal", 0x008080)
        .set("thistle", 0xd8bfd8)
        .set("tomato", 0xff6347)
        .set("turquoise", 0x40e0d0)
        .set("violet", 0xee82ee)
        .set("wheat", 0xf5deb3)
        .set("white", 0xffffff)
        .set("whitesmoke", 0xf5f5f5)
        .set("yellow", 0xffff00)
        .set("yellowgreen", 0x9acd32);

    var darker = .7;
    var brighter = 1 / darker;

    function rgb(r, g, b) {
      if (arguments.length === 1) {
        if (!(r instanceof Color)) r = color(r);
        if (r) {
          r = r.rgb();
          b = r.b;
          g = r.g;
          r = r.r;
        } else {
          r = g = b = NaN;
        }
      }
      return new Rgb(r, g, b);
    }function Rgb(r, g, b) {
      this.r = +r;
      this.g = +g;
      this.b = +b;
    }var ____prototype = rgb.prototype = Rgb.prototype = new Color;

    ____prototype.brighter = function(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Rgb(this.r * k, this.g * k, this.b * k);
    };

    ____prototype.darker = function(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Rgb(this.r * k, this.g * k, this.b * k);
    };

    ____prototype.rgb = function() {
      return this;
    };

    ____prototype.displayable = function() {
      return (0 <= this.r && this.r <= 255)
          && (0 <= this.g && this.g <= 255)
          && (0 <= this.b && this.b <= 255);
    };

    ____prototype.toString = function() {
      return _format(this.r, this.g, this.b);
    };

    function _format(r, g, b) {
      return "#"
          + (isNaN(r) ? "00" : (r = Math.round(r)) < 16 ? "0" + Math.max(0, r).toString(16) : Math.min(255, r).toString(16))
          + (isNaN(g) ? "00" : (g = Math.round(g)) < 16 ? "0" + Math.max(0, g).toString(16) : Math.min(255, g).toString(16))
          + (isNaN(b) ? "00" : (b = Math.round(b)) < 16 ? "0" + Math.max(0, b).toString(16) : Math.min(255, b).toString(16));
    }

    function hsl(h, s, l) {
      if (arguments.length === 1) {
        if (h instanceof Hsl) {
          l = h.l;
          s = h.s;
          h = h.h;
        } else {
          if (!(h instanceof Color)) h = color(h);
          if (h) {
            if (h instanceof Hsl) return h;
            h = h.rgb();
            var r = h.r / 255,
                g = h.g / 255,
                b = h.b / 255,
                min = Math.min(r, g, b),
                max = Math.max(r, g, b),
                range = max - min;
            l = (max + min) / 2;
            if (range) {
              s = l < .5 ? range / (max + min) : range / (2 - max - min);
              if (r === max) h = (g - b) / range + (g < b) * 6;
              else if (g === max) h = (b - r) / range + 2;
              else h = (r - g) / range + 4;
              h *= 60;
            } else {
              h = NaN;
              s = l > 0 && l < 1 ? 0 : h;
            }
          } else {
            h = s = l = NaN;
          }
        }
      }
      return new Hsl(h, s, l);
    }function Hsl(h, s, l) {
      this.h = +h;
      this.s = +s;
      this.l = +l;
    }var ___prototype = hsl.prototype = Hsl.prototype = new Color;

    ___prototype.brighter = function(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Hsl(this.h, this.s, this.l * k);
    };

    ___prototype.darker = function(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Hsl(this.h, this.s, this.l * k);
    };

    ___prototype.rgb = function() {
      var h = this.h % 360 + (this.h < 0) * 360,
          s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
          l = this.l,
          m2 = l + (l < .5 ? l : 1 - l) * s,
          m1 = 2 * l - m2;
      return new Rgb(
        hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
        hsl2rgb(h, m1, m2),
        hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2)
      );
    };

    ___prototype.displayable = function() {
      return (0 <= this.s && this.s <= 1 || isNaN(this.s))
          && (0 <= this.l && this.l <= 1);
    };

    /* From FvD 13.37, CSS Color Module Level 3 */
    function hsl2rgb(h, m1, m2) {
      return (h < 60 ? m1 + (m2 - m1) * h / 60
          : h < 180 ? m2
          : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
          : m1) * 255;
    }

    var deg2rad = Math.PI / 180;
    var _rad2deg = 180 / Math.PI;

    var A = -0.14861;
    var B = +1.78277;
    var C = -0.29227;
    var D = -0.90649;
    var E = +1.97294;
    var ED = E * D;
    var EB = E * B;
    var BC_DA = B * C - D * A;
    function cubehelix(h, s, l) {
      if (arguments.length === 1) {
        if (h instanceof Cubehelix) {
          l = h.l;
          s = h.s;
          h = h.h;
        } else {
          if (!(h instanceof Rgb)) h = rgb(h);
          var r = h.r / 255, g = h.g / 255, b = h.b / 255;
          l = (BC_DA * b + ED * r - EB * g) / (BC_DA + ED - EB);
          var bl = b - l, k = (E * (g - l) - C * bl) / D;
          s = Math.sqrt(k * k + bl * bl) / (E * l * (1 - l)); // NaN if l=0 or l=1
          h = s ? Math.atan2(k, bl) * _rad2deg - 120 : NaN;
          if (h < 0) h += 360;
        }
      }
      return new Cubehelix(h, s, l);
    }function Cubehelix(h, s, l) {
      this.h = +h;
      this.s = +s;
      this.l = +l;
    }var prototype = cubehelix.prototype = Cubehelix.prototype = new Color;

    prototype.brighter = function(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Cubehelix(this.h, this.s, this.l * k);
    };

    prototype.darker = function(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Cubehelix(this.h, this.s, this.l * k);
    };

    prototype.rgb = function() {
      var h = isNaN(this.h) ? 0 : (this.h + 120) * deg2rad,
          l = +this.l,
          a = isNaN(this.s) ? 0 : this.s * l * (1 - l),
          cosh = Math.cos(h),
          sinh = Math.sin(h);
      return new Rgb(
        255 * (l + a * (A * cosh + B * sinh)),
        255 * (l + a * (C * cosh + D * sinh)),
        255 * (l + a * (E * cosh))
      );
    };

    function interpolateRgb(a, b) {
      a = rgb(a);
      b = rgb(b);
      var ar = a.r,
          ag = a.g,
          ab = a.b,
          br = b.r - ar,
          bg = b.g - ag,
          bb = b.b - ab;
      return function(t) {
        return _format(Math.round(ar + br * t), Math.round(ag + bg * t), Math.round(ab + bb * t));
      };
    }

    var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
    var reB = new RegExp(reA.source, "g");
    function interpolate0(b) {
      return function() {
        return b;
      };
    }

    function interpolate1(b) {
      return function(t) {
        return b(t) + "";
      };
    }

    function interpolateString(a, b) {
      var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
          am, // current match in a
          bm, // current match in b
          bs, // string preceding current number in b, if any
          i = -1, // index in s
          s = [], // string constants and placeholders
          q = []; // number interpolators

      // Coerce inputs to strings.
      a = a + "", b = b + "";

      // Interpolate pairs of numbers in a & b.
      while ((am = reA.exec(a))
          && (bm = reB.exec(b))) {
        if ((bs = bm.index) > bi) { // a string precedes the next number in b
          bs = b.slice(bi, bs);
          if (s[i]) s[i] += bs; // coalesce with previous string
          else s[++i] = bs;
        }
        if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
          if (s[i]) s[i] += bm; // coalesce with previous string
          else s[++i] = bm;
        } else { // interpolate non-matching numbers
          s[++i] = null;
          q.push({i: i, x: interpolateNumber(am, bm)});
        }
        bi = reB.lastIndex;
      }

      // Add remains of b.
      if (bi < b.length) {
        bs = b.slice(bi);
        if (s[i]) s[i] += bs; // coalesce with previous string
        else s[++i] = bs;
      }

      // Special optimization for only a single match.
      // Otherwise, interpolate each of the numbers and rejoin the string.
      return s.length < 2 ? (q[0]
          ? interpolate1(q[0].x)
          : interpolate0(b))
          : (b = q.length, function(t) {
              for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
              return s.join("");
            });
    }

    var interpolators = [
      function(a, b) {
        var t = typeof b, c;
        return (t === "string" ? ((c = color(b)) ? (b = c, interpolateRgb) : interpolateString)
            : b instanceof color ? interpolateRgb
            : Array.isArray(b) ? interpolateArray
            : t === "object" && isNaN(b) ? interpolateObject
            : interpolateNumber)(a, b);
      }
    ];

    function interpolateRound(a, b) {
      return a = +a, b -= a, function(t) {
        return Math.round(a + b * t);
      };
    }

    var e10 = Math.sqrt(50);
    var e5 = Math.sqrt(10);
    var e2 = Math.sqrt(2);
    function tickRange(domain, count) {
      if (count == null) count = 10;

      var start = domain[0],
          stop = domain[domain.length - 1];

      if (stop < start) error = stop, stop = start, start = error;

      var span = stop - start,
          step = Math.pow(10, Math.floor(Math.log(span / count) / Math.LN10)),
          error = span / count / step;

      // Filter ticks to get closer to the desired count.
      if (error >= e10) step *= 10;
      else if (error >= e5) step *= 5;
      else if (error >= e2) step *= 2;

      // Round start and stop values to step interval.
      return [
        Math.ceil(start / step) * step,
        Math.floor(stop / step) * step + step / 2, // inclusive
        step
      ];
    }function ticks(domain, count) {
      return _range.apply(null, tickRange(domain, count));
    }

    function nice(domain, step) {
      domain = domain.slice();
      if (!step) return domain;

      var i0 = 0,
          i1 = domain.length - 1,
          x0 = domain[i0],
          x1 = domain[i1],
          t;

      if (x1 < x0) {
        t = i0, i0 = i1, i1 = t;
        t = x0, x0 = x1, x1 = t;
      }

      domain[i0] = Math.floor(x0 / step) * step;
      domain[i1] = Math.ceil(x1 / step) * step;
      return domain;
    }

    function __tickFormat(domain, count, specifier) {
      var range = tickRange(domain, count);
      if (specifier == null) {
        specifier = ",." + precisionFixed(range[2]) + "f";
      } else {
        switch (specifier = formatSpecifier(specifier), specifier.type) {
          case "s": {
            var value = Math.max(Math.abs(range[0]), Math.abs(range[1]));
            if (specifier.precision == null) specifier.precision = precisionPrefix(range[2], value);
            return formatPrefix(specifier, value);
          }
          case "":
          case "e":
          case "g":
          case "p":
          case "r": {
            if (specifier.precision == null) specifier.precision = precisionRound(range[2], Math.max(Math.abs(range[0]), Math.abs(range[1]))) - (specifier.type === "e");
            break;
          }
          case "f":
          case "%": {
            if (specifier.precision == null) specifier.precision = precisionFixed(range[2]) - (specifier.type === "%") * 2;
            break;
          }
        }
      }
      return ___format(specifier);
    }

    function uninterpolateClamp(a, b) {
      b = (b -= a = +a) || 1 / b;
      return function(x) {
        return Math.max(0, Math.min(1, (x - a) / b));
      };
    }

    function uninterpolateNumber(a, b) {
      b = (b -= a = +a) || 1 / b;
      return function(x) {
        return (x - a) / b;
      };
    }

    function bilinear(domain, range, uninterpolate, interpolate) {
      var u = uninterpolate(domain[0], domain[1]),
          i = interpolate(range[0], range[1]);
      return function(x) {
        return i(u(x));
      };
    }

    function polylinear(domain, range, uninterpolate, interpolate) {
      var k = Math.min(domain.length, range.length) - 1,
          u = new Array(k),
          i = new Array(k),
          j = -1;

      // Handle descending domains.
      if (domain[k] < domain[0]) {
        domain = domain.slice().reverse();
        range = range.slice().reverse();
      }

      while (++j < k) {
        u[j] = uninterpolate(domain[j], domain[j + 1]);
        i[j] = interpolate(range[j], range[j + 1]);
      }

      return function(x) {
        var j = bisectRight(domain, x, 1, k) - 1;
        return i[j](u[j](x));
      };
    }

    function newLinear(domain, range, interpolate, clamp) {
      var output,
          input;

      function rescale() {
        var linear = Math.min(domain.length, range.length) > 2 ? polylinear : bilinear,
            uninterpolate = clamp ? uninterpolateClamp : uninterpolateNumber;
        output = linear(domain, range, uninterpolate, interpolate);
        input = linear(range, domain, uninterpolate, interpolateNumber);
        return scale;
      }

      function scale(x) {
        return output(x);
      }

      scale.invert = function(y) {
        return input(y);
      };

      scale.domain = function(x) {
        if (!arguments.length) return domain.slice();
        domain = x.map(Number);
        return rescale();
      };

      scale.range = function(x) {
        if (!arguments.length) return range.slice();
        range = x.slice();
        return rescale();
      };

      scale.rangeRound = function(x) {
        return scale.range(x).interpolate(interpolateRound);
      };

      scale.clamp = function(x) {
        if (!arguments.length) return clamp;
        clamp = !!x;
        return rescale();
      };

      scale.interpolate = function(x) {
        if (!arguments.length) return interpolate;
        interpolate = x;
        return rescale();
      };

      scale.ticks = function(count) {
        return ticks(domain, count);
      };

      scale.tickFormat = function(count, specifier) {
        return __tickFormat(domain, count, specifier);
      };

      scale.nice = function(count) {
        domain = nice(domain, tickRange(domain, count)[2]);
        return rescale();
      };

      scale.copy = function() {
        return newLinear(domain, range, interpolate, clamp);
      };

      return rescale();
    }

    function rebind(scale, linear) {
      scale.range = function() {
        var x = linear.range.apply(linear, arguments);
        return x === linear ? scale : x;
      };

      scale.rangeRound = function() {
        var x = linear.rangeRound.apply(linear, arguments);
        return x === linear ? scale : x;
      };

      scale.clamp = function() {
        var x = linear.clamp.apply(linear, arguments);
        return x === linear ? scale : x;
      };

      scale.interpolate = function() {
        var x = linear.interpolate.apply(linear, arguments);
        return x === linear ? scale : x;
      };

      return scale;
    }function _linear() {
      return newLinear([0, 1], [0, 1], interpolate, false);
    }

    function _newDate(t) {
      return new Date(t);
    }

    function newTime(linear, timeInterval, tickFormat, format) {

      function scale(x) {
        return linear(x);
      }

      scale.invert = function(x) {
        return _newDate(linear.invert(x));
      };

      scale.domain = function(x) {
        if (!arguments.length) return linear.domain().map(_newDate);
        linear.domain(x);
        return scale;
      };

      function tickInterval(interval, start, stop, step) {
        if (interval == null) interval = 10;

        // If a desired tick count is specified, pick a reasonable tick interval
        // based on the extent of the domain and a rough estimate of tick size.
        // If a named interval such as "seconds" was specified, convert to the
        // corresponding time interval and optionally filter using the step.
        // Otherwise, assume interval is already a time interval and use it.
        switch (typeof interval) {
          case "number": interval = chooseTickInterval(start, stop, interval), step = interval[1], interval = interval[0]; break;
          case "string": step = step == null ? 1 : Math.floor(step); break;
          default: return interval;
        }

        return isFinite(step) && step > 0 ? timeInterval(interval, step) : null;
      }

      scale.ticks = function(interval, step) {
        var domain = linear.domain(),
            t0 = domain[0],
            t1 = domain[domain.length - 1],
            t;

        if (t1 < t0) t = t0, t0 = t1, t1 = t;

        return (interval = tickInterval(interval, t0, t1, step))
            ? interval.range(t0, t1 + 1) // inclusive stop
            : [];
      };

      scale.tickFormat = function(specifier) {
        return specifier == null ? tickFormat : format(specifier);
      };

      scale.nice = function(interval, step) {
        var domain = linear.domain(),
            i0 = 0,
            i1 = domain.length - 1,
            t0 = domain[i0],
            t1 = domain[i1],
            t;

        if (t1 < t0) {
          t = i0, i0 = i1, i1 = t;
          t = t0, t0 = t1, t1 = t;
        }

        if (interval = tickInterval(interval, t0, t1, step)) {
          domain[i0] = +interval.floor(t0);
          domain[i1] = +interval.ceil(t1);
          linear.domain(domain);
        }

        return scale;
      };

      scale.copy = function() {
        return newTime(linear.copy(), timeInterval, tickFormat, format);
      };

      return rebind(scale, linear);
    }var millisecondsPerSecond = 1000;
    var millisecondsPerMinute = millisecondsPerSecond * 60;
    var millisecondsPerHour = millisecondsPerMinute * 60;
    var millisecondsPerDay = millisecondsPerHour * 24;
    var millisecondsPerWeek = millisecondsPerDay * 7;
    var millisecondsPerMonth = millisecondsPerDay * 30;
    var millisecondsPerYear = millisecondsPerDay * 365;
    var tickIntervals = [
      ["seconds",  1,      millisecondsPerSecond],
      ["seconds",  5,  5 * millisecondsPerSecond],
      ["seconds", 15, 15 * millisecondsPerSecond],
      ["seconds", 30, 30 * millisecondsPerSecond],
      ["minutes",  1,      millisecondsPerMinute],
      ["minutes",  5,  5 * millisecondsPerMinute],
      ["minutes", 15, 15 * millisecondsPerMinute],
      ["minutes", 30, 30 * millisecondsPerMinute],
      [  "hours",  1,      millisecondsPerHour  ],
      [  "hours",  3,  3 * millisecondsPerHour  ],
      [  "hours",  6,  6 * millisecondsPerHour  ],
      [  "hours", 12, 12 * millisecondsPerHour  ],
      [   "days",  1,      millisecondsPerDay   ],
      [   "days",  2,  2 * millisecondsPerDay   ],
      [  "weeks",  1,      millisecondsPerWeek  ],
      [ "months",  1,      millisecondsPerMonth ],
      [ "months",  3,  3 * millisecondsPerMonth ],
      [  "years",  1,      millisecondsPerYear  ]
    ];

    var bisectTickIntervals = bisector(function(method) {
      return method[2];
    }).right;

    function chooseTickInterval(start, stop, count) {
      var target = Math.abs(stop - start) / count,
          i = bisectTickIntervals(tickIntervals, target);
      return i === tickIntervals.length ? ["years", tickRange([start / millisecondsPerYear, stop / millisecondsPerYear], count)[2]]
          : i ? tickIntervals[target / tickIntervals[i - 1][2] < tickIntervals[i][2] / target ? i - 1 : i]
          : ["milliseconds", tickRange([start, stop], count)[2]];
    }

    var formatMillisecond = __format(".%L");
    var formatSecond = __format(":%S");
    var formatMinute = __format("%I:%M");
    var formatHour = __format("%I %p");
    var formatDay = __format("%a %d");
    var formatWeek = __format("%b %d");
    var formatMonth = __format("%B");
    var formatYear = __format("%Y");
    function _tickFormat(date) {
      return (second(date) < date ? formatMillisecond
          : minute(date) < date ? formatSecond
          : hour(date) < date ? formatMinute
          : day(date) < date ? formatHour
          : month(date) < date ? (sunday(date) < date ? formatDay : formatWeek)
          : year(date) < date ? formatMonth
          : formatYear)(date);
    }

    function millisecond(step) {
      return {
        range: function(start, stop) { return _range(Math.ceil(start / step) * step, stop, step).map(_newDate); },
        floor: function(date) { return _newDate(Math.floor(date / step) * step); },
        ceil: function(date) { return _newDate(Math.ceil(date / step) * step); }
      };
    }function _timeInterval(interval, step) {
      switch (interval) {
        case "milliseconds": return millisecond(step);
        case "seconds": return step > 1 ? second.filter(function(d) { return d.getSeconds() % step === 0; }) : second;
        case "minutes": return step > 1 ? minute.filter(function(d) { return d.getMinutes() % step === 0; }) : minute;
        case "hours": return step > 1 ? hour.filter(function(d) { return d.getHours() % step === 0; }) : hour;
        case "days": return step > 1 ? day.filter(function(d) { return (d.getDate() - 1) % step === 0; }) : day;
        case "weeks": return step > 1 ? sunday.filter(function(d) { return sunday.count(0, d) % step === 0; }) : sunday;
        case "months": return step > 1 ? month.filter(function(d) { return d.getMonth() % step === 0; }) : month;
        case "years": return step > 1 ? year.filter(function(d) { return d.getFullYear() % step === 0; }) : year;
      }
    }

    function time() {
      return newTime(_linear(), _timeInterval, _tickFormat, __format).domain([new Date(2000, 0, 1), new Date(2000, 0, 2)]);
    }

    var formatUTCMillisecond = utcFormat(".%L");
    var formatUTCSecond = utcFormat(":%S");
    var formatUTCMinute = utcFormat("%I:%M");
    var formatUTCHour = utcFormat("%I %p");
    var formatUTCDay = utcFormat("%a %d");
    var formatUTCWeek = utcFormat("%b %d");
    var formatUTCMonth = utcFormat("%B");
    var formatUTCYear = utcFormat("%Y");
    function tickFormat(date) {
      return (utcSecond(date) < date ? formatUTCMillisecond
          : utcMinute(date) < date ? formatUTCSecond
          : utcHour(date) < date ? formatUTCMinute
          : utcDay(date) < date ? formatUTCHour
          : utcMonth(date) < date ? (utcSunday(date) < date ? formatUTCDay : formatUTCWeek)
          : utcYear(date) < date ? formatUTCMonth
          : formatUTCYear)(date);
    }

    function timeInterval(interval, step) {
      switch (interval) {
        case "milliseconds": return millisecond(step);
        case "seconds": return step > 1 ? utcSecond.filter(function(d) { return d.getUTCSeconds() % step === 0; }) : utcSecond;
        case "minutes": return step > 1 ? utcMinute.filter(function(d) { return d.getUTCMinutes() % step === 0; }) : utcMinute;
        case "hours": return step > 1 ? utcHour.filter(function(d) { return d.getUTCHours() % step === 0; }) : utcHour;
        case "days": return step > 1 ? utcDay.filter(function(d) { return (d.getUTCDate() - 1) % step === 0; }) : utcDay;
        case "weeks": return step > 1 ? utcSunday.filter(function(d) { return utcSunday.count(0, d) % step === 0; }) : utcSunday;
        case "months": return step > 1 ? utcMonth.filter(function(d) { return d.getUTCMonth() % step === 0; }) : utcMonth;
        case "years": return step > 1 ? utcYear.filter(function(d) { return d.getUTCFullYear() % step === 0; }) : utcYear;
      }
    }

    function utcTime() {
      return newTime(_linear(), timeInterval, tickFormat, utcFormat).domain([Date.UTC(2000, 0, 1), Date.UTC(2000, 0, 2)]);
    }

    function newThreshold(domain, range, n) {

      function scale(x) {
        if (x <= x) return range[bisectRight(domain, x, 0, n)];
      }

      scale.domain = function(x) {
        if (!arguments.length) return domain.slice();
        domain = x.slice(), n = Math.min(domain.length, range.length - 1);
        return scale;
      };

      scale.range = function(x) {
        if (!arguments.length) return range.slice();
        range = x.slice(), n = Math.min(domain.length, range.length - 1);
        return scale;
      };

      scale.invertExtent = function(y) {
        return y = range.indexOf(y), [domain[y - 1], domain[y]];
      };

      scale.copy = function() {
        return newThreshold(domain, range);
      };

      return scale;
    }function threshold() {
      return newThreshold([.5], [0, 1], 1);
    }

    function newPow(linear, exponent, domain) {

      function powp(x) {
        return x < 0 ? -Math.pow(-x, exponent) : Math.pow(x, exponent);
      }

      function powb(x) {
        return x < 0 ? -Math.pow(-x, 1 / exponent) : Math.pow(x, 1 / exponent);
      }

      function scale(x) {
        return linear(powp(x));
      }

      scale.invert = function(x) {
        return powb(linear.invert(x));
      };

      scale.exponent = function(x) {
        if (!arguments.length) return exponent;
        exponent = +x;
        return scale.domain(domain);
      };

      scale.domain = function(x) {
        if (!arguments.length) return domain.slice();
        domain = x.map(Number);
        linear.domain(domain.map(powp));
        return scale;
      };

      scale.ticks = function(count) {
        return ticks(domain, count);
      };

      scale.tickFormat = function(count, specifier) {
        return __tickFormat(domain, count, specifier);
      };

      scale.nice = function(count) {
        return scale.domain(nice(domain, tickRange(domain, count)[2]));
      };

      scale.copy = function() {
        return newPow(linear.copy(), exponent, domain);
      };

      return rebind(scale, linear);
    }

    function sqrt() {
      return newPow(_linear(), .5, [0, 1]);
    }function pow() {
      return newPow(_linear(), 1, [0, 1]);
    }

    function newQuantize(x0, x1, range) {
      var kx, i;

      function scale(x) {
        return range[Math.max(0, Math.min(i, Math.floor(kx * (x - x0))))];
      }

      function rescale() {
        kx = range.length / (x1 - x0);
        i = range.length - 1;
        return scale;
      }

      scale.domain = function(x) {
        if (!arguments.length) return [x0, x1];
        x0 = +x[0];
        x1 = +x[x.length - 1];
        return rescale();
      };

      scale.range = function(x) {
        if (!arguments.length) return range.slice();
        range = x.slice();
        return rescale();
      };

      scale.invertExtent = function(y) {
        y = range.indexOf(y);
        y = y < 0 ? NaN : y / kx + x0;
        return [y, y + 1 / kx];
      };

      scale.copy = function() {
        return newQuantize(x0, x1, range); // copy on write
      };

      return rescale();
    }

    function quantize() {
      return newQuantize(0, 1, [0, 1]);
    }

    function newQuantile(domain, range) {
      var thresholds;

      function rescale() {
        var k = 0,
            q = range.length;
        thresholds = [];
        while (++k < q) thresholds[k - 1] = quantile(domain, k / q);
        return scale;
      }

      function scale(x) {
        if (!isNaN(x = +x)) return range[bisectRight(thresholds, x)];
      }

      scale.domain = function(x) {
        if (!arguments.length) return domain;
        domain = [];
        for (var i = 0, n = x.length, v; i < n; ++i) if (v = x[i], v != null && !isNaN(v = +v)) domain.push(v);
        domain.sort(_ascending);
        return rescale();
      };

      scale.range = function(x) {
        if (!arguments.length) return range.slice();
        range = x.slice();
        return rescale();
      };

      scale.quantiles = function() {
        return thresholds;
      };

      scale.invertExtent = function(y) {
        y = range.indexOf(y);
        return y < 0 ? [NaN, NaN] : [
          y > 0 ? thresholds[y - 1] : domain[0],
          y < thresholds.length ? thresholds[y] : domain[domain.length - 1]
        ];
      };

      scale.copy = function() {
        return newQuantile(domain, range); // copy on write!
      };

      return rescale();
    }

    function _quantile() {
      return newQuantile([], []);
    }

    function steps(length, start, step) {
      var steps = new Array(length), i = -1;
      while (++i < length) steps[i] = start + step * i;
      return steps;
    }

    function newOrdinal(domain, ranger) {
      var index,
          range,
          rangeBand;

      function scale(x) {
        var k = x + "", i = index.get(k);
        if (!i) {
          if (ranger.t !== "range") return;
          index.set(k, i = domain.push(x));
        }
        return range[(i - 1) % range.length];
      }

      scale.domain = function(x) {
        if (!arguments.length) return domain.slice();
        domain = [];
        index = new Map;
        var i = -1, n = x.length, xi, xk;
        while (++i < n) if (!index.has(xk = (xi = x[i]) + "")) index.set(xk, domain.push(xi));
        return scale[ranger.t].apply(scale, ranger.a);
      };

      scale.range = function(x) {
        if (!arguments.length) return range.slice();
        range = x.slice();
        rangeBand = 0;
        ranger = {t: "range", a: arguments};
        return scale;
      };

      scale.rangePoints = function(x, padding) {
        padding = arguments.length < 2 ? 0 : +padding;
        var start = +x[0],
            stop = +x[1],
            step = domain.length < 2 ? (start = (start + stop) / 2, 0) : (stop - start) / (domain.length - 1 + padding);
        range = steps(domain.length, start + step * padding / 2, step);
        rangeBand = 0;
        ranger = {t: "rangePoints", a: arguments};
        return scale;
      };

      scale.rangeRoundPoints = function(x, padding) {
        padding = arguments.length < 2 ? 0 : +padding;
        var start = +x[0],
            stop = +x[1],
            step = domain.length < 2 ? (start = stop = Math.round((start + stop) / 2), 0) : (stop - start) / (domain.length - 1 + padding) | 0; // bitwise floor for symmetry
        range = steps(domain.length, start + Math.round(step * padding / 2 + (stop - start - (domain.length - 1 + padding) * step) / 2), step);
        rangeBand = 0;
        ranger = {t: "rangeRoundPoints", a: arguments};
        return scale;
      };

      scale.rangeBands = function(x, padding, outerPadding) {
        padding = arguments.length < 2 ? 0 : +padding;
        outerPadding = arguments.length < 3 ? padding : +outerPadding;
        var reverse = +x[1] < +x[0],
            start = +x[reverse - 0],
            stop = +x[1 - reverse],
            step = (stop - start) / (domain.length - padding + 2 * outerPadding);
        range = steps(domain.length, start + step * outerPadding, step);
        if (reverse) range.reverse();
        rangeBand = step * (1 - padding);
        ranger = {t: "rangeBands", a: arguments};
        return scale;
      };

      scale.rangeRoundBands = function(x, padding, outerPadding) {
        padding = arguments.length < 2 ? 0 : +padding;
        outerPadding = arguments.length < 3 ? padding : +outerPadding;
        var reverse = +x[1] < +x[0],
            start = +x[reverse - 0],
            stop = +x[1 - reverse],
            step = Math.floor((stop - start) / (domain.length - padding + 2 * outerPadding));
        range = steps(domain.length, start + Math.round((stop - start - (domain.length - padding) * step) / 2), step);
        if (reverse) range.reverse();
        rangeBand = Math.round(step * (1 - padding));
        ranger = {t: "rangeRoundBands", a: arguments};
        return scale;
      };

      scale.rangeBand = function() {
        return rangeBand;
      };

      scale.rangeExtent = function() {
        var t = ranger.a[0], start = t[0], stop = t[t.length - 1];
        if (stop < start) t = stop, stop = start, start = t;
        return [start, stop];
      };

      scale.copy = function() {
        return newOrdinal(domain, ranger);
      };

      return scale.domain(domain);
    }

    function ordinal() {
      return newOrdinal([], {t: "range", a: [[]]});
    }

    var tickFormat10 = ___format(".0e");
    var tickFormatOther = ___format(",");
    function newLog(linear, base, domain) {

      function log(x) {
        return (domain[0] < 0 ? -Math.log(x > 0 ? 0 : -x) : Math.log(x < 0 ? 0 : x)) / Math.log(base);
      }

      function pow(x) {
        return domain[0] < 0 ? -Math.pow(base, -x) : Math.pow(base, x);
      }

      function scale(x) {
        return linear(log(x));
      }

      scale.invert = function(x) {
        return pow(linear.invert(x));
      };

      scale.base = function(x) {
        if (!arguments.length) return base;
        base = +x;
        return scale.domain(domain);
      };

      scale.domain = function(x) {
        if (!arguments.length) return domain.slice();
        domain = x.map(Number);
        linear.domain(domain.map(log));
        return scale;
      };

      scale.nice = function() {
        var x = nice(linear.domain(), 1);
        linear.domain(x);
        domain = x.map(pow);
        return scale;
      };

      scale.ticks = function() {
        var u = domain[0],
            v = domain[domain.length - 1];
        if (v < u) i = u, u = v, v = i;
        var i = Math.floor(log(u)),
            j = Math.ceil(log(v)),
            k,
            t,
            n = base % 1 ? 2 : base,
            ticks = [];

        if (isFinite(j - i)) {
          if (u > 0) {
            for (--j, k = 1; k < n; ++k) if ((t = pow(i) * k) < u) continue; else ticks.push(t);
            while (++i < j) for (k = 1; k < n; ++k) ticks.push(pow(i) * k);
            for (k = 1; k < n; ++k) if ((t = pow(i) * k) > v) break; else ticks.push(t);
          } else {
            for (++i, k = n - 1; k >= 1; --k) if ((t = pow(i) * k) < u) continue; else ticks.push(t);
            while (++i < j) for (k = n - 1; k >= 1; --k) ticks.push(pow(i) * k);
            for (k = n - 1; k >= 1; --k) if ((t = pow(i) * k) > v) break; else ticks.push(t);
          }
        }

        return ticks;
      };

      scale.tickFormat = function(count, specifier) {
        if (specifier == null) specifier = base === 10 ? tickFormat10 : tickFormatOther;
        else if (typeof specifier !== "function") specifier = ___format(specifier);
        if (count == null) return specifier;
        var k = Math.min(base, scale.ticks().length / count),
            f = domain[0] > 0 ? (e = 1e-12, Math.ceil) : (e = -1e-12, Math.floor),
            e;
        return function(d) {
          return pow(f(log(d) + e)) / d >= k ? specifier(d) : "";
        };
      };

      scale.copy = function() {
        return newLog(linear.copy(), base, domain);
      };

      return rebind(scale, linear);
    }

    function log() {
      return newLog(_linear(), 10, [1, 10]);
    }

    function newIdentity(domain) {

      function scale(x) {
        return +x;
      }

      scale.invert = scale;

      scale.domain = scale.range = function(x) {
        if (!arguments.length) return domain.slice();
        domain = x.map(Number);
        return scale;
      };

      scale.ticks = function(count) {
        return ticks(domain, count);
      };

      scale.tickFormat = function(count, specifier) {
        return __tickFormat(domain, count, specifier);
      };

      scale.copy = function() {
        return newIdentity(domain);
      };

      return scale;
    }

    function __identity() {
      return newIdentity([0, 1]);
    }

    function category20c() {
      return ordinal().range([
        "#3182bd", "#6baed6", "#9ecae1", "#c6dbef",
        "#e6550d", "#fd8d3c", "#fdae6b", "#fdd0a2",
        "#31a354", "#74c476", "#a1d99b", "#c7e9c0",
        "#756bb1", "#9e9ac8", "#bcbddc", "#dadaeb",
        "#636363", "#969696", "#bdbdbd", "#d9d9d9"
      ]);
    }

    function category20b() {
      return ordinal().range([
        "#393b79", "#5254a3", "#6b6ecf", "#9c9ede",
        "#637939", "#8ca252", "#b5cf6b", "#cedb9c",
        "#8c6d31", "#bd9e39", "#e7ba52", "#e7cb94",
        "#843c39", "#ad494a", "#d6616b", "#e7969c",
        "#7b4173", "#a55194", "#ce6dbd", "#de9ed6"
      ]);
    }

    function category20() {
      return ordinal().range([
        "#1f77b4", "#aec7e8",
        "#ff7f0e", "#ffbb78",
        "#2ca02c", "#98df8a",
        "#d62728", "#ff9896",
        "#9467bd", "#c5b0d5",
        "#8c564b", "#c49c94",
        "#e377c2", "#f7b6d2",
        "#7f7f7f", "#c7c7c7",
        "#bcbd22", "#dbdb8d",
        "#17becf", "#9edae5"
      ]);
    }

    function category10() {
      return ordinal().range([
        "#1f77b4",
        "#ff7f0e",
        "#2ca02c",
        "#d62728",
        "#9467bd",
        "#8c564b",
        "#e377c2",
        "#7f7f7f",
        "#bcbd22",
        "#17becf"
      ]);
    }

    function _defaultView(node) {
      return node
          && ((node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
              || (node.document && node) // node is a Window
              || node.defaultView); // node is a Document
    }

    function selection_dispatch(type, params) {

      function dispatchConstant() {
        return dispatchEvent(this, type, params);
      }

      function dispatchFunction() {
        return dispatchEvent(this, type, params.apply(this, arguments));
      }

      return this.each(typeof params === "function" ? dispatchFunction : dispatchConstant);
    }function dispatchEvent(node, type, params) {
      var window = _defaultView(node),
          event = window.CustomEvent;

      if (event) {
        event = new event(type, params);
      } else {
        event = window.document.createEvent("Event");
        if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
        else event.initEvent(type, false, false);
      }

      node.dispatchEvent(event);
    }

    var requoteRe = /[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;

    function _requote(string) {
      return string.replace(requoteRe, "\\$&");
    }

    var filterEvents = new Map;

    var _event = null;

    if (typeof document !== "undefined") {
      var _element = document.documentElement;
      if (!("onmouseenter" in _element)) {
        filterEvents.set("mouseenter", "mouseover").set("mouseleave", "mouseout");
      }
    }

    function selection_event(type, listener, capture) {
      var n = arguments.length,
          key = "__on" + type,
          filter,
          root = this._root;

      if (n < 2) return (n = this.node()[key]) && n._listener;

      if (n < 3) capture = false;
      if ((n = type.indexOf(".")) > 0) type = type.slice(0, n);
      if (filter = filterEvents.has(type)) type = filterEvents.get(type);

      function add() {
        var ancestor = root, i = arguments.length >> 1, ancestors = new Array(i);
        while (--i >= 0) ancestor = ancestor[arguments[(i << 1) + 1]], ancestors[i] = i ? ancestor._parent : ancestor;
        var l = listenerOf(listener, ancestors, arguments);
        if (filter) l = filterListenerOf(l);
        remove.call(this);
        this.addEventListener(type, this[key] = l, l._capture = capture);
        l._listener = listener;
      }

      function remove() {
        var l = this[key];
        if (l) {
          this.removeEventListener(type, l, l._capture);
          delete this[key];
        }
      }

      function removeAll() {
        var re = new RegExp("^__on([^.]+)" + _requote(type) + "$"), match;
        for (var name in this) {
          if (match = name.match(re)) {
            var l = this[name];
            this.removeEventListener(match[1], l, l._capture);
            delete this[name];
          }
        }
      }

      return this.each(listener
          ? (n ? add : noop) // Attempt to add untyped listener is ignored.
          : (n ? remove : removeAll));
    }function listenerOf(listener, ancestors, args) {
      return function(event1) {
        var i = ancestors.length, event0 = _event; // Events can be reentrant (e.g., focus).
        while (--i >= 0) args[i << 1] = ancestors[i].__data__;
        _event = event1;
        try {
          listener.apply(ancestors[0], args);
        } finally {
          _event = event0;
        }
      };
    }

    function filterListenerOf(listener) {
      return function(event) {
        var related = event.relatedTarget;
        if (!related || (related !== this && !(related.compareDocumentPosition(this) & 8))) {
          listener(event);
        }
      };
    }

    function noop() {}

    function selection_datum(value) {
      return arguments.length ? this.property("__data__", value) : this.node().__data__;
    }

    function selection_remove() {
      return this.each(function() {
        var parent = this.parentNode;
        if (parent) parent.removeChild(this);
      });
    }

    function selectorOf(selector) {
      return function() {
        return this.querySelector(selector);
      };
    }

    var namespaces = (new Map)
        .set("svg", "http://www.w3.org/2000/svg")
        .set("xhtml", "http://www.w3.org/1999/xhtml")
        .set("xlink", "http://www.w3.org/1999/xlink")
        .set("xml", "http://www.w3.org/XML/1998/namespace")
        .set("xmlns", "http://www.w3.org/2000/xmlns/");

    function namespace(name) {
      var i = name.indexOf(":"), prefix = name;
      if (i >= 0) prefix = name.slice(0, i), name = name.slice(i + 1);
      return namespaces.has(prefix) ? {space: namespaces.get(prefix), local: name} : name;
    }

    function selection_append(creator, selector) {
      if (typeof creator !== "function") creator = creatorOf(creator);

      function append() {
        return this.appendChild(creator.apply(this, arguments));
      }

      function insert() {
        return this.insertBefore(creator.apply(this, arguments), selector.apply(this, arguments) || null);
      }

      return this.select(arguments.length < 2
          ? append
          : (typeof selector !== "function" && (selector = selectorOf(selector)), insert));
    }function creatorOf(name) {
      name = namespace(name);

      function creator() {
        var document = this.ownerDocument,
            uri = this.namespaceURI;
        return uri
            ? document.createElementNS(uri, name)
            : document.createElement(name);
      }

      function creatorNS() {
        return this.ownerDocument.createElementNS(name.space, name.local);
      }

      return name.local ? creatorNS : creator;
    }

    function selection_html(value) {
      if (!arguments.length) return this.node().innerHTML;

      function setConstant() {
        this.innerHTML = value;
      }

      function setFunction() {
        var v = value.apply(this, arguments);
        this.innerHTML = v == null ? "" : v;
      }

      if (value == null) value = "";

      return this.each(typeof value === "function" ? setFunction : setConstant);
    }

    function selection_text(value) {
      if (!arguments.length) return this.node().textContent;

      function setConstant() {
        this.textContent = value;
      }

      function setFunction() {
        var v = value.apply(this, arguments);
        this.textContent = v == null ? "" : v;
      }

      if (value == null) value = "";

      return this.each(typeof value === "function" ? setFunction : setConstant);
    }

    function selection_class(name, value) {
      name = (name + "").trim().split(/^|\s+/);
      var n = name.length;

      if (arguments.length < 2) {
        var node = this.node(), i = -1;
        if (value = node.classList) { // SVG elements may not support DOMTokenList!
          while (++i < n) if (!value.contains(name[i])) return false;
        } else {
          value = node.getAttribute("class");
          while (++i < n) if (!classedRe(name[i]).test(value)) return false;
        }
        return true;
      }

      name = name.map(classerOf);

      function setConstant() {
        var i = -1;
        while (++i < n) name[i](this, value);
      }

      function setFunction() {
        var i = -1, x = value.apply(this, arguments);
        while (++i < n) name[i](this, x);
      }

      return this.each(typeof value === "function" ? setFunction : setConstant);
    }function classerOf(name) {
      var re;
      return function(node, value) {
        if (c = node.classList) return value ? c.add(name) : c.remove(name);
        if (!re) re = classedRe(name);
        var c = node.getAttribute("class") || "";
        if (value) {
          re.lastIndex = 0;
          if (!re.test(c)) node.setAttribute("class", collapse(c + " " + name));
        } else {
          node.setAttribute("class", collapse(c.replace(re, " ")));
        }
      };
    }

    function collapse(string) {
      return string.trim().replace(/\s+/g, " ");
    }

    function classedRe(name) {
      return new RegExp("(?:^|\\s+)" + _requote(name) + "(?:\\s+|$)", "g");
    }

    function selection_property(name, value) {
      if (arguments.length < 2) return this.node()[name];

      function remove() {
        delete this[name];
      }

      function setConstant() {
        this[name] = value;
      }

      function setFunction() {
        var x = value.apply(this, arguments);
        if (x == null) delete this[name];
        else this[name] = x;
      }

      return this.each(value == null ? remove : typeof value === "function" ? setFunction : setConstant);
    }

    function selection_style(name, value, priority) {
      var n = arguments.length;

      if (n < 2) return _defaultView(n = this.node()).getComputedStyle(n, null).getPropertyValue(name);

      if (n < 3) priority = "";

      function remove() {
        this.style.removeProperty(name);
      }

      function setConstant() {
        this.style.setProperty(name, value, priority);
      }

      function setFunction() {
        var x = value.apply(this, arguments);
        if (x == null) this.style.removeProperty(name);
        else this.style.setProperty(name, x, priority);
      }

      return this.each(value == null ? remove : typeof value === "function" ? setFunction : setConstant);
    }

    function selection_attr(name, value) {
      name = namespace(name);

      if (arguments.length < 2) {
        var node = this.node();
        return name.local
            ? node.getAttributeNS(name.space, name.local)
            : node.getAttribute(name);
      }

      function remove() {
        this.removeAttribute(name);
      }

      function removeNS() {
        this.removeAttributeNS(name.space, name.local);
      }

      function setConstant() {
        this.setAttribute(name, value);
      }

      function setConstantNS() {
        this.setAttributeNS(name.space, name.local, value);
      }

      function setFunction() {
        var x = value.apply(this, arguments);
        if (x == null) this.removeAttribute(name);
        else this.setAttribute(name, x);
      }

      function setFunctionNS() {
        var x = value.apply(this, arguments);
        if (x == null) this.removeAttributeNS(name.space, name.local);
        else this.setAttributeNS(name.space, name.local, x);
      }

      return this.each(value == null
          ? (name.local ? removeNS : remove)
          : (typeof value === "function"
              ? (name.local ? setFunctionNS : setFunction)
              : (name.local ? setConstantNS : setConstant)));
    }

    function selection_each(callback) {
      var depth = this._depth,
          stack = new Array(depth);

      function visit(nodes, depth) {
        var i = -1,
            n = nodes.length,
            node;

        if (--depth) {
          var stack0 = depth * 2,
              stack1 = stack0 + 1;
          while (++i < n) {
            if (node = nodes[i]) {
              stack[stack0] = node._parent.__data__, stack[stack1] = i;
              visit(node, depth);
            }
          }
        }

        else {
          while (++i < n) {
            if (node = nodes[i]) {
              stack[0] = node.__data__, stack[1] = i;
              callback.apply(node, stack);
            }
          }
        }
      }

      visit(this._root, depth);
      return this;
    }

    function selection_empty() {
      return !this.node();
    }

    function selection_size() {
      var size = 0;
      this.each(function() { ++size; });
      return size;
    }

    function selection_node() {
      return firstNode(this._root, this._depth);
    }function firstNode(nodes, depth) {
      var i = -1,
          n = nodes.length,
          node;

      if (--depth) {
        while (++i < n) {
          if (node = nodes[i]) {
            if (node = firstNode(node, depth)) {
              return node;
            }
          }
        }
      }

      else {
        while (++i < n) {
          if (node = nodes[i]) {
            return node;
          }
        }
      }
    }

    function selection_nodes() {
      var nodes = new Array(this.size()), i = -1;
      this.each(function() { nodes[++i] = this; });
      return nodes;
    }

    function selection_call() {
      var callback = arguments[0];
      callback.apply(arguments[0] = this, arguments);
      return this;
    }

    // The leaf groups of the selection hierarchy are initially NodeList,
    // and then lazily converted to arrays when mutation is required.
    function arrayify(selection) {
      return selection._root = arrayifyNode(selection._root, selection._depth);
    }function arrayifyNode(nodes, depth) {
      var i = -1,
          n = nodes.length,
          node;

      if (--depth) {
        while (++i < n) {
          if (node = nodes[i]) {
            nodes[i] = arrayifyNode(node, depth);
          }
        }
      }

      else if (!Array.isArray(nodes)) {
        var array = new Array(n);
        while (++i < n) array[i] = nodes[i];
        array._parent = nodes._parent;
        nodes = array;
      }

      return nodes;
    }

    function selection_sort(comparator) {
      if (!comparator) comparator = ascending;

      function compare(a, b) {
        return a && b ? comparator(a.__data__, b.__data__) : !a - !b;
      }

      function visit(nodes, depth) {
        if (--depth) {
          var i = -1,
              n = nodes.length,
              node;
          while (++i < n) {
            if (node = nodes[i]) {
              visit(node, depth);
            }
          }
        }

        else {
          nodes.sort(compare);
        }
      }

      visit(arrayify(this), this._depth);
      return this.order();
    }function ascending(a, b) {
      return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
    }

    function selection_order() {
      orderNode(this._root, this._depth);
      return this;
    }function orderNode(nodes, depth) {
      var i = nodes.length,
          node,
          next;

      if (--depth) {
        while (--i >= 0) {
          if (node = nodes[i]) {
            orderNode(node, depth);
          }
        }
      }

      else {
        next = nodes[--i];
        while (--i >= 0) {
          if (node = nodes[i]) {
            if (next && next !== node.nextSibling) next.parentNode.insertBefore(node, next);
            next = node;
          }
        }
      }
    }

    function emptyOf(selection) {
      return new Selection(emptyNode(arrayify(selection), selection._depth), selection._depth);
    }function emptyNode(nodes, depth) {
      var i = -1,
          n = nodes.length,
          node,
          empty = new Array(n);

      if (--depth) {
        while (++i < n) {
          if (node = nodes[i]) {
            empty[i] = emptyNode(node, depth);
          }
        }
      }

      empty._parent = nodes._parent;
      return empty;
    }

    // Lazily constructs the exit selection for this (update) selection.
    // Until this selection is joined to data, the exit selection will be empty.
    function selection_exit() {
      return this._exit || (this._exit = emptyOf(this));
    }

    // Lazily constructs the enter selection for this (update) selection.
    // Until this selection is joined to data, the enter selection will be empty.
    function selection_enter() {
      if (!this._enter) {
        this._enter = emptyOf(this);
        this._enter._update = this;
      }
      return this._enter;
    }

    // The value may either be an array or a function that returns an array.
    // An optional key function may be specified to control how data is bound;
    // if no key function is specified, data is bound to nodes by index.
    // Or, if no arguments are specified, this method returns all bound data.
    function selection_data(value, key) {
      if (!value) {
        var data = new Array(this.size()), i = -1;
        this.each(function(d) { data[++i] = d; });
        return data;
      }

      var depth = this._depth - 1,
          stack = new Array(depth * 2),
          bind = key ? bindKey : bindIndex;

      if (typeof value !== "function") value = valueOf_(value);
      visit(this._root, this.enter()._root, this.exit()._root, depth);

      function visit(update, enter, exit, depth) {
        var i = -1,
            n,
            node;

        if (depth--) {
          var stack0 = depth * 2,
              stack1 = stack0 + 1;

          n = update.length;

          while (++i < n) {
            if (node = update[i]) {
              stack[stack0] = node._parent.__data__, stack[stack1] = i;
              visit(node, enter[i], exit[i], depth);
            }
          }
        }

        else {
          var j = 0,
              before;

          bind(update, enter, exit, value.apply(update._parent, stack));
          n = update.length;

          // Now connect the enter nodes to their following update node, such that
          // appendChild can insert the materialized enter node before this node,
          // rather than at the end of the parent node.
          while (++i < n) {
            if (before = enter[i]) {
              if (i >= j) j = i + 1;
              while (!(node = update[j]) && ++j < n);
              before._next = node || null;
            }
          }
        }
      }

      function bindIndex(update, enter, exit, data) {
        var i = 0,
            node,
            nodeLength = update.length,
            dataLength = data.length,
            minLength = Math.min(nodeLength, dataLength);

        // Clear the enter and exit arrays, and then initialize to the new length.
        enter.length = 0, enter.length = dataLength;
        exit.length = 0, exit.length = nodeLength;

        for (; i < minLength; ++i) {
          if (node = update[i]) {
            node.__data__ = data[i];
          } else {
            enter[i] = new EnterNode(update._parent, data[i]);
          }
        }

        // Note: we don’t need to delete update[i] here because this loop only
        // runs when the data length is greater than the node length.
        for (; i < dataLength; ++i) {
          enter[i] = new EnterNode(update._parent, data[i]);
        }

        // Note: and, we don’t need to delete update[i] here because immediately
        // following this loop we set the update length to data length.
        for (; i < nodeLength; ++i) {
          if (node = update[i]) {
            exit[i] = update[i];
          }
        }

        update.length = dataLength;
      }

      function bindKey(update, enter, exit, data) {
        var i,
            node,
            dataLength = data.length,
            nodeLength = update.length,
            nodeByKeyValue = new Map,
            keyStack = new Array(2).concat(stack),
            keyValues = new Array(nodeLength),
            keyValue;

        // Clear the enter and exit arrays, and then initialize to the new length.
        enter.length = 0, enter.length = dataLength;
        exit.length = 0, exit.length = nodeLength;

        // Compute the keys for each node.
        for (i = 0; i < nodeLength; ++i) {
          if (node = update[i]) {
            keyStack[0] = node.__data__, keyStack[1] = i;
            keyValues[i] = keyValue = key.apply(node, keyStack);

            // Is this a duplicate of a key we’ve previously seen?
            // If so, this node is moved to the exit selection.
            if (nodeByKeyValue.has(keyValue)) {
              exit[i] = node;
            }

            // Otherwise, record the mapping from key to node.
            else {
              nodeByKeyValue.set(keyValue, node);
            }
          }
        }

        // Now clear the update array and initialize to the new length.
        update.length = 0, update.length = dataLength;

        // Compute the keys for each datum.
        for (i = 0; i < dataLength; ++i) {
          keyStack[0] = data[i], keyStack[1] = i;
          keyValue = key.apply(update._parent, keyStack);

          // Is there a node associated with this key?
          // If not, this datum is added to the enter selection.
          if (!(node = nodeByKeyValue.get(keyValue))) {
            enter[i] = new EnterNode(update._parent, data[i]);
          }

          // Did we already bind a node using this key? (Or is a duplicate?)
          // If unique, the node and datum are joined in the update selection.
          // Otherwise, the datum is ignored, neither entering nor exiting.
          else if (node !== true) {
            update[i] = node;
            node.__data__ = data[i];
          }

          // Record that we consumed this key, either to enter or update.
          nodeByKeyValue.set(keyValue, true);
        }

        // Take any remaining nodes that were not bound to data,
        // and place them in the exit selection.
        for (i = 0; i < nodeLength; ++i) {
          if ((node = nodeByKeyValue.get(keyValues[i])) !== true) {
            exit[i] = node;
          }
        }
      }

      return this;
    }function EnterNode(parent, datum) {
      this.ownerDocument = parent.ownerDocument;
      this.namespaceURI = parent.namespaceURI;
      this._next = null;
      this._parent = parent;
      this.__data__ = datum;
    }

    EnterNode.prototype = {
      appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
      insertBefore: function(child, next) { return this._parent.insertBefore(child, next || this._next); }
    };

    function valueOf_(value) { // XXX https://github.com/rollup/rollup/issues/12
      return function() {
        return value;
      };
    }

    // The filter may either be a selector string (e.g., ".foo")
    // or a function that returns a boolean.
    function selection_filter(filter) {
      var depth = this._depth,
          stack = new Array(depth * 2);

      if (typeof filter !== "function") filter = filterOf(filter);

      function visit(nodes, depth) {
        var i = -1,
            n = nodes.length,
            node,
            subnodes;

        if (--depth) {
          var stack0 = depth * 2,
              stack1 = stack0 + 1;
          subnodes = new Array(n);
          while (++i < n) {
            if (node = nodes[i]) {
              stack[stack0] = node._parent.__data__, stack[stack1] = i;
              subnodes[i] = visit(node, depth);
            }
          }
        }

        // The filter operation does not preserve the original index,
        // so the resulting leaf groups are dense (not sparse).
        else {
          subnodes = [];
          while (++i < n) {
            if (node = nodes[i]) {
              stack[0] = node.__data__, stack[1] = i;
              if (filter.apply(node, stack)) {
                subnodes.push(node);
              }
            }
          }
        }

        subnodes._parent = nodes._parent;
        return subnodes;
      }

      return new Selection(visit(this._root, depth), depth);
    }var filterOf = function(selector) {
      return function() {
        return this.matches(selector);
      };
    };

    if (typeof document !== "undefined") {
      var element = document.documentElement;
      if (!element.matches) {
        var vendorMatches = element.webkitMatchesSelector || element.msMatchesSelector || element.mozMatchesSelector || element.oMatchesSelector;
        filterOf = function(selector) { return function() { return vendorMatches.call(this, selector); }; };
      }
    }

    // The selector may either be a selector string (e.g., ".foo")
    // or a function that optionally returns an array of nodes to select.
    // This is the only operation that increases the depth of a selection.
    function selection_selectAll(selector) {
      var depth = this._depth,
          stack = new Array(depth * 2);

      if (typeof selector !== "function") selector = selectorAllOf(selector);

      function visit(nodes, depth) {
        var i = -1,
            n = nodes.length,
            node,
            subnode,
            subnodes = new Array(n);

        if (--depth) {
          var stack0 = depth * 2,
              stack1 = stack0 + 1;
          while (++i < n) {
            if (node = nodes[i]) {
              stack[stack0] = node._parent.__data__, stack[stack1] = i;
              subnodes[i] = visit(node, depth);
            }
          }
        }

        // Data is not propagated since there is a one-to-many mapping.
        // The parent of the new leaf group is the old node.
        else {
          while (++i < n) {
            if (node = nodes[i]) {
              stack[0] = node.__data__, stack[1] = i;
              subnodes[i] = subnode = selector.apply(node, stack);
              subnode._parent = node;
            }
          }
        }

        subnodes._parent = nodes._parent;
        return subnodes;
      }

      return new Selection(visit(this._root, depth), depth + 1);
    }function selectorAllOf(selector) {
      return function() {
        return this.querySelectorAll(selector);
      };
    }

    // The selector may either be a selector string (e.g., ".foo")
    // or a function that optionally returns the node to select.
    function selection_select(selector) {
      var depth = this._depth,
          stack = new Array(depth * 2);

      if (typeof selector !== "function") selector = selectorOf(selector);

      function visit(nodes, update, depth) {
        var i = -1,
            n = nodes.length,
            node,
            subnode,
            subnodes = new Array(n);

        if (--depth) {
          var stack0 = depth * 2,
              stack1 = stack0 + 1;
          while (++i < n) {
            if (node = nodes[i]) {
              stack[stack0] = node._parent.__data__, stack[stack1] = i;
              subnodes[i] = visit(node, update && update[i], depth);
            }
          }
        }

        // The leaf group may be sparse if the selector returns a falsey value;
        // this preserves the index of nodes (unlike selection.filter).
        // Propagate data to the new node only if it is defined on the old.
        // If this is an enter selection, materialized nodes are moved to update.
        else {
          while (++i < n) {
            if (node = nodes[i]) {
              stack[0] = node.__data__, stack[1] = i;
              if (subnode = selector.apply(node, stack)) {
                if ("__data__" in node) subnode.__data__ = node.__data__;
                if (update) update[i] = subnode, delete nodes[i];
                subnodes[i] = subnode;
              }
            }
          }
        }

        subnodes._parent = nodes._parent;
        return subnodes;
      }

      return new Selection(visit(this._root, this._update && this._update._root, depth), depth);
    }

    // When depth = 1, root = [Node, …].
    // When depth = 2, root = [[Node, …], …].
    // When depth = 3, root = [[[Node, …], …], …]. etc.
    // Note that [Node, …] and NodeList are used interchangeably; see arrayify.
    function Selection(root, depth) {
      this._root = root;
      this._depth = depth;
      this._enter = this._update = this._exit = null;
    }function _selection() {
      return new Selection([document.documentElement], 1);
    }

    Selection.prototype = _selection.prototype = {
      select: selection_select,
      selectAll: selection_selectAll,
      filter: selection_filter,
      data: selection_data,
      enter: selection_enter,
      exit: selection_exit,
      order: selection_order,
      sort: selection_sort,
      call: selection_call,
      nodes: selection_nodes,
      node: selection_node,
      size: selection_size,
      empty: selection_empty,
      each: selection_each,
      attr: selection_attr,
      style: selection_style,
      property: selection_property,
      class: selection_class,
      classed: selection_class, // deprecated alias
      text: selection_text,
      html: selection_html,
      append: selection_append,
      insert: selection_append, // deprecated alias
      remove: selection_remove,
      datum: selection_datum,
      event: selection_event,
      on: selection_event, // deprecated alias
      dispatch: selection_dispatch
    };

    function select(selector) {
      return new Selection([typeof selector === "string" ? document.querySelector(selector) : selector], 1);
    }

    function selectAll(selector) {
      return new Selection(typeof selector === "string" ? document.querySelectorAll(selector) : selector, 1);
    }

    const functor = function(x) {
      return (typeof x === 'function')
        ? x
        : function() { return x; };
    };

    var d3_bundle = {
      get event() { return _event; },
      select: select,
      selectAll: selectAll,
      functor: functor,
      scale: __scale,
      format: ___format,
      range: _range,
      ascending: _ascending,
      descending: descending,
      sum: sum,
      json: json,
      xhr: xhr
    };

    return d3_bundle;

}));