To get started, set your OPENAI_API_KEY environment variable, or other required keys for the providers you selected.

Next, edit promptfooconfig.yaml.

Then run:

```
promptfoo eval
npx promptfoo@latest eval --no-cache
npx promptfoo@latest eval --no-cache --output results.json
npx promptfoo@latest eval -c promptfooconfig_strict.yaml --no-cache
```

Afterwards, you can view the results by running `promptfoo view`
