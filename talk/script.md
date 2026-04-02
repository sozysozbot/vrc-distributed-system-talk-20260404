# モデル検査入門 - 分散アルゴリズムの正当性について
Initial draft talk script / outline  
Language of this draft: English  
Audience: a small distributed-systems meetup, likely including professional software engineers who are not necessarily trained in mathematical logic or formal methods

---

## Context and aims of the talk

This talk is **not** primarily a sales pitch for formal methods tools, nor an attempt to convince the audience that they should immediately start using theorem provers or model checkers in their daily work.

The deeper aim is to give the audience a way to think about the following questions:

- What is a **specification**, really?
- In what sense can specifications be made precise enough that we can check systems against them?
- What is a **model** of a system, and how is it different from the real system?
- What are formal methods actually trying to do, and what are they **not** able to do?
- How should software engineers think about responsibility, correctness, and justification, especially in a future where AI systems increasingly generate code?

The intended message is roughly this:

1. A specification is not merely a document passed around by a manager.  
   It is, more fundamentally, something that downstream people can **rely on** in order to reason about outcomes.

2. Formal methods are one family of techniques for making some specifications precise enough to be mechanically checked.  
   But the formalization is **not the same thing** as the real-world intent behind the specification.

3. Models are useful precisely because they are **not** reality.  
   They live in a mathematical world, and we use them to predict and reason about reality. That gap is unavoidable and important.

4. Current formal methods are powerful but limited.  
   They are not the final form of software engineering, and they do not solve everything. They carve out parts of reality that are structured enough to reason about.

5. Even so, this line of thinking matters, because software engineering is inseparable from responsibility.  
   If outcomes are not specified in a form people can rely on, nontrivial downstream reasoning becomes impossible.

6. In an era of AI-generated software, this may become even more relevant.  
   The point is not that responsibility disappears; rather, we may increasingly need the ability to read and judge what has actually been verified, and what has not.

This draft is therefore trying to balance:
- accessibility for a non-specialist technical audience,
- one concrete technical example, namely CTL model checking,
- and a broader philosophical / engineering message about responsible software development.

---

## Suggested framing at the very beginning

Before I start, let me tell you what kind of talk this is.

This is partly a technical talk, but not only that. There are a few different things mixed together here.

- If you are mainly interested in day-to-day software engineering, I want you to pay attention to the parts where I talk about **specifications**, **responsibility**, and what it means to justify the behavior of software.
- If you are interested in the more mathematical side, then the part on **CTL** and **model checking** is probably where you should lean in.
- If you are interested in the bigger picture, especially in relation to AI and future tooling, then I want you to listen for the question: **how should we think about software correctness when code generation becomes cheap?**

Also, this talk is not trying to tell you that one particular tool is the answer.  
I am not here to say “everybody should go use Lean”, or “everybody should go use TLA+”, or “CTL model checking is the right way to verify software”.

Instead, what I want to do is give you a conceptual map:
- what a specification is,
- what a model is,
- what model checking is trying to do,
- what theorem proving is trying to do,
- and how to think about these technologies without either overestimating them or dismissing them.

---

# Talk draft

## 1. Opening

Today I want to talk about model checking, distributed algorithms, and correctness.

But really, the question underneath all of this is simpler:

**What does it mean to say that a system is correct?**

And before that, an even more basic question:

**What is a specification?**

If you work in software, the word “specification” probably already means something to you.  
Maybe it means a requirements document. Maybe it means a design doc. Maybe it means a ticket. Maybe it means a message from a product manager.

That is one use of the word, and it is a practical one.  
But today I want to push us toward a different view.

I want to suggest that a specification is, in a deeper sense, something that allows somebody downstream to **reason** about the system.

If a library says, “this function sorts a list”, that statement is not just documentation in the casual sense.  
It is something I rely on when I write code on top of it.

If a consensus system says, “two different committed values can never appear at the same log position”, that statement is not just a slogan.  
It is something an application built on top of that system might fundamentally depend on.

So one way to think about a specification is this:

> A specification is something we rely on in order to make further reasoning possible.

And that is why specifications matter.

Because if outcomes are not specified in a way that can be relied on, then downstream reasoning becomes impossible, or at least extremely fragile.

---

## 2. A specification is not merely a document

At this point, I want to make a distinction.

A specification is not merely the PDF or the wiki page or the requirements document.  
Those are media through which a specification may be communicated.

The deeper thing is the content that tells us what we are allowed to assume.

And that content can be vague, informal, partially formalized, or fully formalized.

So the first thing I want the audience to unlearn is the idea that “specification” just means a human-written document passed from one person to another.

That document may be useful.  
But from the point of view of reasoning, the interesting question is:

**What exactly does it entitle me to conclude?**

That is where formal methods enter the picture.

Not because formal methods are the ultimate goal.  
And not because every important specification can be fully formalized.

But because they show, very clearly, that there are situations in which we can make parts of a specification precise enough that a machine can check whether some model satisfies it.

That is already a profound shift.

It means that specification is not only a social artifact.  
It can also become an object of mathematical manipulation.

---

## 3. Before “model checking”, what is a model?

Before I say “model checking”, I need to pause on the word **model**.

Because I do not mean “model” in the model-theory sense, where a model satisfies a logical theory.  
What I mean here is more practical.

A model is a simplified stand-in for a real system.

A familiar analogy is a map.

A map is not the terrain.  
A subway map is not the city.  
It does not contain every wall, every smell, every crack in the road, every moving object, every human intention.

But that is exactly why it is useful.

It deliberately throws away detail in order to preserve some structure that matters for a purpose.

And that is the first thing a model does: it **simplifies**.

But there is a second point, and to me it is even more important:

A model does not merely simplify reality.  
It also **disconnects** us from reality.

Once we have written down a Kripke structure or a labeled transition system, we are no longer directly talking about the real cluster, the real machines, the real network cards, the actual timing behavior of the hardware, or the actual users.

We are now in a mathematical world.

And when we prove something about the mathematical object, that fact does not automatically jump back into reality by magic.

What we get is not direct certainty about the real system.  
What we get is a reasoned prediction:

- if this real system is adequately represented by this model,
- and if the property we wrote down adequately captures the requirement we care about,
- and if our checking procedure is sound,

then we gain confidence that the real system has the relevant property.

That gap is not a bug in formal methods.  
It is the entire situation.

And this matters especially whenever the system has a strong physical aspect:
- elevator safety systems,
- traffic signals,
- robotics,
- embedded systems,
- timing-sensitive hardware interactions.

In such settings, careless modeling can be disastrous.

So one of the most important lessons I want to communicate is:

> Verification is always verification of a model, under assumptions.

And therefore one must never confuse:
- the real-world requirement,
- the formal property,
- the real implementation,
- and the mathematical model of that implementation.

These are related, but they are not identical.

---

## 4. So what are formal methods trying to do?

At this point, I can say what I think formal methods are trying to do.

They are not trying to capture all of reality at once.

They are not trying to replace engineering judgment.

And they are not trying to eliminate all ambiguity from all software development.

What they do, in many cases, is carve out a part of the world that is structured enough to be reasoned about mechanically.

That is both their power and their limitation.

For example:
- type systems check certain classes of invariants statically,
- model checking explores state spaces of abstract machines,
- theorem provers let us encode definitions and proofs in a precise logical framework.

These are all different ways of making some claim precise enough that it becomes checkable.

But none of them is “the final answer”.

In fact, I think it is important not to let people come away from this talk with the belief that formalization is the goal in itself.

It is not.

Formalization is a technique.  
A powerful one, sometimes beautiful, often useful, but still a technique.

The goal is responsible reasoning about software and systems.

---

## 5. One concrete path: temporal logic and model checking

Now I want to get more concrete.

Suppose I have a system with states and transitions:
- maybe a distributed protocol,
- maybe a lock implementation,
- maybe a transaction protocol,
- maybe a toy consensus model.

Then one way to describe that system mathematically is as a transition structure:
a graph of states, where edges represent possible next steps.

And one family of logics for specifying properties of such systems is **temporal logic**.

The idea of temporal logic is that we do not just say what is true in a single state.  
We also talk about what must hold:
- in the next state,
- along some future path,
- on all possible futures,
- eventually,
- forever.

And one concrete example is **CTL**, Computation Tree Logic.

I am choosing CTL today not because it is the one true logic for distributed systems, but because it is a reasonably accessible example of what it looks like to specify properties over a branching state space and check them algorithmically.

There are alternatives:
- LTL,
- CTL\*,
- process-algebraic approaches such as CSP,
- theorem-proving approaches in proof assistants such as Lean or Rocq,
- and many others.

I am not trying to give a survey of the entire field.  
I just want one example that is concrete enough to hold in our hands.

---

## 6. Very brief intuition for CTL

In CTL, formulas are built from:
- ordinary propositions about a state,
- boolean connectives such as “and” and “not”,
- and temporal operators that combine path quantification and time.

For example, very informally:

- **AX φ**: in all immediate next states, φ holds
- **EX φ**: there exists an immediate next state in which φ holds
- **AF φ**: along all paths, eventually φ holds
- **EF φ**: there exists some path along which eventually φ holds
- **AG φ**: along all paths, φ always holds
- **EG φ**: there exists some path along which φ always holds

You can already hear the kinds of questions this lets us ask:

- Is it possible to get stuck in a bad state?
- Is safety preserved forever?
- Is recovery possible from here?
- Must a request eventually be served?
- Can a deadlock occur on some execution?

That is the flavor.

---

## 7. What is model checking?

Given:
1. a model of the system, such as a Kripke structure,
2. and a formula, such as a CTL formula,

the model-checking problem is:

> Does this model satisfy this formula?

That is a very elegant setup, because it cleanly separates two things:
- the mathematical structure representing behavior,
- and the mathematical statement representing the requirement.

Then the checking procedure is a mechanical algorithm.

And one thing I like about CTL as a teaching example is that the checker can be implemented in a very small amount of code.

At least at the toy level, the core ideas fit in a compact recursive evaluator plus a few graph algorithms.

So this is not just abstract philosophy.  
It is something you can actually implement in a small prototype and inspect line by line.

That makes it pedagogically valuable.

---

## 8. A distributed-systems-flavored example

Because this is a distributed systems gathering, I do not want the example to be only traffic lights and toy locks.

I would like us to at least imagine a small consensus-like system.

Not necessarily full industrial Raft with every practical detail.  
That would be too much for this talk.

But a simplified transition system that resembles part of the behavior of a consensus cluster:
- nodes may be followers, candidates, or leaders,
- elections may occur,
- logs may be replicated,
- some entries may be committed,
- messages may be delayed or lost in the model,
- and some failure patterns may be represented.

A state might record things like:
- each node’s role,
- current term,
- portions of the log,
- who the leader is, if any,
- and which entries are considered committed.

A transition might represent:
- a timeout,
- a vote,
- a leader election,
- an append-entries step,
- a commit step,
- maybe a failure or message loss event, depending on the abstraction.

This already gives us a branching transition system.

And then we can ask safety questions.

For example, here is the kind of property we might want:

> There are never two distinct leaders in the same term.

Or:

> Once an entry is committed at a given log index, no different value can ever become committed at that same index.

Or more loosely:

> If some value is committed, then all future committed views remain consistent with it.

I am being intentionally informal at this moment, because the exact formalization depends on how we encode states and propositions.  
But this is the general shape.

And one useful thing here is that we do not need a complete industrial-grade model to learn something.

Even a deliberately naive protocol, or a simplified protocol with a known flaw, can be a good teaching tool:
because then a failed property check gives us a counterexample trace.

And counterexamples are one of the most educational outputs a model checker can produce.

They show not merely that “something is wrong”, but how a bad state can arise.

---

## 9. Safety and liveness

This is also a good moment to distinguish two broad kinds of properties:
**safety** and **liveness**.

Safety is the idea that “something bad never happens”.

For example:
- two leaders do not exist simultaneously in some forbidden way,
- two committed values do not conflict,
- mutual exclusion is never violated.

Liveness is the idea that “something good eventually happens”.

For example:
- eventually a leader is elected,
- eventually a request gets committed,
- eventually a transaction completes.

In real distributed systems, liveness is often much trickier than safety, because failures and fairness assumptions matter enormously.

And that is actually pedagogically helpful.

Because it lets us say something honest:

Even a very good protocol may have liveness properties that do **not** hold under arbitrary failures.

That is not necessarily a bug.  
It may be a consequence of the model and the environment assumptions.

So a model checker finding that some liveness statement fails is not always embarrassing.  
Sometimes it is exactly the intended result.

Again, this is a good lesson:
what is true depends on the model and the assumptions.

---

## 10. Why not stop at CTL?

At this point I should explicitly say: CTL is not the entire world.

There are other ways to formalize systems and properties.

For example, in some traditions we do not primarily write a temporal formula and ask whether a model satisfies it.  
Instead, we compare one process description against another, or reason about observational equivalence, refinement, simulation, bisimulation, and so on.

That is a very different style.

Likewise, interactive theorem proving is different again.

In a proof assistant, we do not merely run a checker over a finite-state transition system.  
We might define:
- a programming language,
- an operational semantics,
- a type system,
- a protocol,
- an invariant,
- and then prove theorems about all of that in a general logical framework.

That gives us tremendous expressive power.

But it also comes with different costs.

So I do not want this talk to leave the impression that CTL model checking is “the way” to verify distributed systems.

It is just one very clear window into the broader landscape.

---

## 11. Specifications as things we invoke

Now I want to return to the earlier philosophical point, but make it more practical.

In dependently typed settings, there is a familiar idea that programs and proofs interact.

There is a computational layer and a reasoning layer, and they meet in concrete ways.

For instance, once you know some fact that rules out an impossible case, that fact can be used to justify an operation that would otherwise be unsafe.

So from the point of view of downstream reasoning, a proved theorem behaves a lot like a library artifact:
it is something available to be used.

This is what I mean when I say that a specification, once formalized and established, can act like a library function.

Not because it computes in the same way.
But because downstream work may critically depend on it.

If I build an application on top of a replicated log, and I need consistency properties of that log to justify the application’s correctness, then those properties are not decorative.  
They are prerequisites for the reasoning I want to perform.

So a specification is not merely something written at the beginning of a project.  
It is also something that supports everything built afterward.

This is why I connect specifications with responsibility.

Without stable things to rely on, there can be no serious downstream justification.

---

## 12. Testing, model checking, theorem proving

It is also worth comparing a few approaches very roughly.

### Testing
Testing asks:
- does the implementation behave as expected on these examples or workloads?

Testing is essential.  
But testing never explores all possibilities.

### Model checking
Model checking asks:
- given this abstract model and this formal property, does the property hold in the model?

This can explore an entire finite or finitely represented state space and often yields counterexamples.

### Theorem proving
Theorem proving asks:
- can we construct a formal proof, inside a logical framework, that some statement follows from definitions and assumptions?

This is often more expressive, but also often more labor-intensive.

None of these replaces the others completely.

And none of them removes the burden of thinking.

Even a perfect formal proof only proves what it actually states, from the assumptions it actually uses.

So the important skill is not merely “use a powerful tool”.

The important skill is:
- understand what has been modeled,
- understand what has been specified,
- understand what has been proved or checked,
- and understand what remains outside the formal envelope.

---

## 13. Current limitations of formal methods

I want to be explicit here: we are not done.

Current formal methods, as of 2026, are not the ultimate shape of software engineering.

I do not know a toolchain that simultaneously gives us all of the following in one seamless package:

- extremely efficient low-level executable code in the style people expect from systems languages,
- rich interaction with realistic hardware concerns,
- sophisticated static reasoning about time or resource bounds,
- expressive formal models of complicated software behavior,
- and practical end-to-end proof workflows that ordinary teams can routinely adopt.

We have many partial techniques:
- type systems,
- lightweight static analyses,
- model checkers,
- proof assistants,
- domain-specific verification tools,
- proof-carrying code ideas,
- certified compilation in some niches,
- and so on.

These are remarkable achievements.  
But they do not add up to “the whole problem has been solved”.

So again, I do not want the audience to come away thinking:
“Ah, formal methods are the destination, and the only problem is that people have not adopted them enough.”

No.

The situation is more subtle.

These methods are attempts to make some forms of justification precise and machine-checkable.

That is already valuable, even if incomplete.

---

## 14. Why this still matters, especially now

Now let me make the larger claim.

Even if you never use CTL.  
Even if you never touch Lean or Rocq.  
Even if you never write a model checker.

I still think this matters.

Why?

Because software engineering is not only about making things run.  
It is also about being able to answer questions like:

- What does this system guarantee?
- Under what assumptions?
- Why do we believe that?
- What exactly was checked?
- What exactly remains unchecked?

And those questions become more important, not less important, when code becomes cheap to generate.

We are entering an era in which generative AI can increasingly produce implementations very quickly.

I am not making the claim that AI solves verification.  
And I am not saying that responsibility goes away.

On the contrary.

My point is that if software generation becomes cheaper, then the value of being able to interpret, assess, and justify software behavior may become even more visible.

Perhaps proof exploration will become cheaper too.  
Perhaps formal artifacts will become easier to generate.  
Perhaps not perfectly, perhaps not reliably, perhaps not soon enough for many use cases.

But even in that world, the central human question remains:

> What has actually been shown, and why should I trust that interpretation?

Unless you are doing research specifically about how proofs are found, most of the time what you care about is not the romance of proof search itself.  
What you care about is whether some claim has actually been established.

And to use such technology responsibly, you need at least the ability to read off:
- what the formal statement says,
- what it does not say,
- and why someone is entitled to rely on it.

If that sounds relevant to your future, then I think the study of logic and formal methods is worth your attention.

---

## 15. What I want you to take away

So let me summarize the real message of this talk.

First:

**A specification is not just a document.**  
It is something that enables reliance and downstream reasoning.

Second:

**A model is not the real system.**  
It is a mathematical stand-in, useful precisely because it is selective and abstract.

Third:

**Verification always happens relative to a model and assumptions.**  
This is not a weakness unique to formal methods; it is the structure of the problem.

Fourth:

**CTL model checking is one concrete example** of how we can represent a system mathematically, write down requirements formally, and mechanically check whether they hold.

Fifth:

**Formal methods are neither magic nor pointless.**  
They are limited, but they reveal something deep about what it means to justify software behavior.

And finally:

**You do not have to adopt these tools tomorrow.**  
But I do hope you leave with the ability to judge what they are trying to do, where they may matter, and how to recognize when they become relevant to your own work.

---

## 16. Optional closing

If I have done this talk well, then even if you never become a formal methods person, I hope at least one thing has shifted.

I hope the next time someone says “specification”, you do not hear only “document”.

I hope you also hear:

- something to rely on,
- something that constrains reasoning,
- something that can sometimes be formalized,
- something that may support responsibility,
- and something whose precision determines what kinds of claims can responsibly be made.

And if that shift happens, I think this talk will have succeeded.

---

# Appendix: optional slide-level structure

## Slide 1
Title  
モデル検査入門 - 分散アルゴリズムの正当性について

## Slide 2
What kind of talk this is  
- practical engineering angle
- technical logic angle
- future / AI angle

## Slide 3
Main question  
What is a specification?

## Slide 4
Specification is not merely a document  
- downstream reasoning
- reliance
- guarantees

## Slide 5
Before model checking: what is a model?  
- map analogy
- simplification
- disconnection from reality

## Slide 6
Verification is about a model under assumptions  
- not magic
- not direct transfer to reality

## Slide 7
What formal methods try to do  
- carve out a tractable slice
- make claims checkable

## Slide 8
Temporal logic idea  
- properties over time / branching futures

## Slide 9
CTL in one slide  
- AX, EX, AF, EF, AG, EG

## Slide 10
What is model checking?  
model + formula -> does the property hold?

## Slide 11
Distributed example  
- simplified consensus / Raft-like state machine

## Slide 12
Safety vs liveness  
- safety: bad things never happen
- liveness: good things eventually happen

## Slide 13
Counterexamples are useful  
- not only failure, but explanation

## Slide 14
Other approaches  
- LTL / CTL*
- CSP / process comparison
- theorem proving

## Slide 15
Specifications as usable artifacts  
- theorem/spec as something downstream reasoning depends on

## Slide 16
Testing vs model checking vs theorem proving

## Slide 17
Limitations of current tools  
- not the final answer
- not end-to-end for everything

## Slide 18
Why this matters in the AI era  
- code generation gets cheaper
- interpretation and justification still matter

## Slide 19
Takeaways

## Slide 20
Closing question  
What are you actually relying on when you say a system is correct?

---

# Appendix: notes to self for tone

- Do not overstate what formal methods can do.
- Do not present CTL as “the correct approach”.
- Repeatedly distinguish:
  - real-world requirement,
  - formal property,
  - real implementation,
  - mathematical model.
- Keep bringing the audience back to responsibility and downstream reasoning.
- Use one recurring distributed-systems example if possible.
- If time is short, compress technical details before compressing the conceptual framing.