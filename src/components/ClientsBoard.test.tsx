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
});
