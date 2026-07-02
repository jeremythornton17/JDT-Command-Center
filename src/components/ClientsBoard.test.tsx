import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { ClientRecord, JobRecord, ProjectRecord } from "../commandCenter/records";
import ClientsBoard from "./ClientsBoard";

describe("ClientsBoard", () => {
  it("renders newly saved client audit history without crashing", () => {
    const clients: ClientRecord[] = [
      {
        id: "client-test-landscape",
        name: "Test Landscape",
        contactName: "Pat Foreman",
        phone: "863-555-0100",
        email: "pat@example.com",
        billingAddress: "100 Nursery Road",
        history: [
          {
            date: "2026-05-31T20:30:00.000Z",
            user: "jeremy@jdtnurseries.com",
            event: "Created client",
          },
        ],
      },
    ];

    assert.doesNotThrow(() => {
      renderToString(
        <ClientsBoard
          clients={clients}
          openModal={() => undefined}
          openDrawer={() => undefined}
        />,
      );
    });
  });

  it("shows linked project and job counts for each client", () => {
    const clients: ClientRecord[] = [
      {
        id: "client-mcarthur-golf-club",
        name: "McArthur Golf Club",
      },
    ];
    const projects: ProjectRecord[] = [
      {
        id: "project-mcarthur-golf-club-hole-3-install",
        title: "Hole 3 Install",
        clientId: "client-mcarthur-golf-club",
        clientName: "McArthur Golf Club",
      },
    ];
    const jobs: JobRecord[] = [
      {
        id: "job-hole-3-install-root-prune",
        title: "Root prune",
        clientId: "client-mcarthur-golf-club",
        projectId: "project-mcarthur-golf-club-hole-3-install",
      },
    ];

    const html = renderToString(
      <ClientsBoard
        clients={clients}
        projects={projects}
        jobs={jobs}
        openModal={() => undefined}
        openDrawer={() => undefined}
      />,
    );

    assert.match(html, /1 project/);
    assert.match(html, /1 job/);
    assert.match(html, /View Full Profile/);
  });

  it("uses a compact client account register as the default clients view", () => {
    const clients: ClientRecord[] = [
      {
        id: "cli-2275",
        name: "Boca West Country Club",
        contactName: "Travis Wehrs",
        phone: "(239) 340-9223",
        email: "TWehrs@bocawestcc.org",
        billingAddress: "20583 Boca West Dr, Boca Raton, FL 33434",
        billingDetails: "Net 30",
      },
      {
        id: "client-missing-contact",
        name: "Missing Contact Client",
      },
    ];
    const projects: ProjectRecord[] = [
      {
        id: "project-boca-course-1",
        title: "Boca West Course 1 Renovation",
        clientId: "cli-2275",
        clientName: "Boca West Country Club",
        status: "Active",
      },
    ];
    const jobs: JobRecord[] = [
      {
        id: "job-boca-root-prune",
        title: "Root prune",
        clientId: "cli-2275",
        projectId: "project-boca-course-1",
        status: "Active",
      },
    ];

    const html = renderToString(
      <ClientsBoard
        clients={clients}
        projects={projects}
        jobs={jobs}
        openModal={() => undefined}
        openDrawer={() => undefined}
      />,
    );

    assert.match(html, /Client Account Register/);
    assert.match(html, /Active Projects/);
    assert.match(html, /Open Jobs/);
    assert.match(html, /Missing Info/);
    assert.match(html, /Roster View/);
    assert.match(html, /Card View/);
    assert.match(html, /Boca West Course 1 Renovation/);
    assert.match(html, /Missing contact/);
    assert.doesNotMatch(html, /grid gap-6 md:grid-cols-2/);
  });
});
