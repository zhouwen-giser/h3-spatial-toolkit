# REST examples

```bash
curl -s http://localhost:3000/v1/h3/index \
  -H 'content-type: application/json' \
  -d '{"points":[{"longitude":139.7671,"latitude":35.6812}],"resolution":9}'

curl -s http://localhost:3000/v1/h3/neighbors \
  -H 'content-type: application/json' \
  -d '{"cell":"892f5a32d97ffff","radius":1}'

curl -s http://localhost:3000/v1/h3/polygon/cover \
  -H 'content-type: application/json' \
  -d @examples/polygon-request.json
```
