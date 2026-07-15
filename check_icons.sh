#!/bin/bash
node -e "
const l = require('/home/nwasim/projects/ddn-kv-cache/frontend/node_modules/lucide-react');
const icons = ['Server','DollarSign','Hash','RefreshCw','Clock','MemoryStick','Upload','Download','ChevronDown','ChevronUp','Info','ToggleLeft','ToggleRight','Database','Zap','Send','Trash2','Users'];
icons.forEach(i => console.log(i + ':', typeof l[i]));
"
