(function(){'use strict';
/* Performance guard: realtime/push events are authoritative. Do not throttle loadData here. */
window.KUDAJITU_PERFORMANCE={queueSync:'realtime-first',fallbackPollingSeconds:30};
})();