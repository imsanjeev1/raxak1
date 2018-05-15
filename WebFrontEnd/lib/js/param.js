/*******
From http://myjs.us/param.js
by Joseph Meyers
See: http://www.htmlgoodies.com/beyond/javascript/article.php/11877_3755006_3/How-to-Use-a-JavaScript-Query-String-Parser.htm
******/

function ptq(q)
{
/* parse the query */
/* semicolons are nonstandard but we accept them */
var x = q.replace(/;/g, '&').split('&'), i, name, t;
/* q changes from string version of query to object */
for (q={}, i=0; i<x.length; i++)
{
    var n = x[i].indexOf("=");
    var t=[];
    t[0] = x[i].substr(0, n);
    t[1] = x[i].substr(n+1, x[i].length );
    name = unescape(t[0]);
if (!q[name])
q[name] = [];
if (t.length > 1)
{
q[name][q[name].length] = unescape(t[1]);
}
/* next two lines are nonstandard */
else
q[name][q[name].length] = true;
}
return q;
}

function param() {
return ptq(location.search.substring(1).replace(/\+/g, ' '));
}

function entify(s)
/* convert unsafe characters to HTML entities */
{
return (''+s).
replace(/&/g, '&amp;').
replace(/</g, '&lt;').
replace(/"/g, '&quot;').
replace(/>/g, '&gt;');
}
