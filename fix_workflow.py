import json
import urllib.request
import os

with open('/Users/sheng-feng/.gemini/antigravity/brain/6b56d2b3-8761-4604-9705-bec6a357e090/.system_generated/steps/45/output.txt', 'r') as f:
    wf = json.load(f)

nodes = wf['data']['nodes']
for node in nodes:
    if node['id'] in ['read-radar-lab', 'reset-logs-sheet-id']:
        node['credentials'] = {
            "googleApi": {
                "id": "dBSVmF3ujlFgno35",
                "name": "Google Service Account account"
            }
        }
        node['parameters']['authentication'] = 'serviceAccount'
    if node['id'] == 'format-response':
        code = node['parameters']['jsCode']
        code = code.replace('time: data.日期 || data.Date || ""', 'time: data.Time || data.時間 || data.Date || data.日期 || ""')
        code = code.replace('currentCapital: initialCapital + totalPnL,', '// currentCapital calculated by UI')
        node['parameters']['jsCode'] = code

with open('updated_nodes.json', 'w') as f:
    json.dump(nodes, f)
