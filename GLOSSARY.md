# Artifacts

Shareable, never-indexed HTML pages published at `artifacts.inakilozano.com`, which the owner shares with other people to view, edit or answer.

## Language

**Artifact**:
A published HTML page with its files, addressed by a slug. A presentation, a form or an interactive tool is an artifact like any other.
_Avoid_: Page, document, deck

**Owner**:
The single person who publishes artifacts and decides who can reach each one.
_Avoid_: Admin, co-owner

**Account**:
A person other than the owner, identified by their email across all artifacts, with an optional alias shown in place of the email.
_Avoid_: Credential, user, guest

**Role**:
What an account may do on one artifact: viewer, responder or editor.
_Avoid_: Permission, access level

**Viewer**:
A role that can only see the artifact.
_Avoid_: Reader

**Responder**:
A role that can see the artifact and submit its own response, without touching the state.

**Editor**:
A role that can change the artifact's state. An editor never changes the artifact's HTML or files.
_Avoid_: Collaborator

**General access**:
What anyone who is not invited gets on an artifact: nothing (restricted), a role for whoever has the link, or a role for whoever knows the shared password.
_Avoid_: Visibility, public, private

**Shared password**:
One password for an artifact that grants the general-access role without identifying who entered it.
_Avoid_: Passcode, PIN

**Share**:
The grant of a role on one artifact to one account. A person's effective role is the highest among their share and the general access.
_Avoid_: Grant, membership, ACL entry

**Invitation**:
The email that tells a person an artifact was shared with them and, if they have no account yet, lets them set their password.

**State**:
The single shared document of data an artifact keeps, changed by editors and versioned by revision.
_Avoid_: Content, data

**Response**:
One person's answers to an artifact's questions, visible only to that person and the owner. It is separate from the state.
_Avoid_: Submission, answer, entry

**Answer key**:
The correct answers to an artifact's questions, kept apart from the artifact's files so that no one who can see the artifact can read it.
_Avoid_: Solution, grading
