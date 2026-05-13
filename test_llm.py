from crewai import Agent, Task, Crew, Process
from crewai import LLM

# Try instantiating LLM directly
my_llm = LLM(
    model="ollama/gemma4:e2b",
    base_url="http://172.31.192.1:11434"
)

agent = Agent(
    role="Tester",
    goal="Test",
    backstory="You are a tester.",
    llm=my_llm,
    verbose=True
)

task = Task(
    description="Say 'Hello World'",
    expected_output="Hello World",
    agent=agent
)

crew = Crew(agents=[agent], tasks=[task], process=Process.sequential)
result = crew.kickoff()
print(result)
