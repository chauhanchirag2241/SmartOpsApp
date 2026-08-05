import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SchoolBootstrap } from '../models/school-bootstrap.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SchoolService {
  private readonly api = inject(ApiService);

  findBySchoolCode(schoolCode: string): Observable<SchoolBootstrap> {
    const code = encodeURIComponent(schoolCode.trim());
    return this.api.get<SchoolBootstrap | Record<string, unknown>>(`schools/by-code/${code}`).pipe(
      map((raw) => this.normalize(raw)),
    );
  }

  private normalize(raw: SchoolBootstrap | Record<string, unknown>): SchoolBootstrap {
    const r = raw as Record<string, unknown>;
    return {
      id: String(r['id'] ?? r['Id'] ?? ''),
      name: String(r['name'] ?? r['Name'] ?? ''),
      subdomain: String(r['subdomain'] ?? r['Subdomain'] ?? ''),
      schoolCode: (r['schoolCode'] ?? r['SchoolCode'] ?? null) as string | null,
      shortName: (r['shortName'] ?? r['ShortName'] ?? null) as string | null,
      tagline: (r['tagline'] ?? r['Tagline'] ?? null) as string | null,
      logoUrl: (r['logoUrl'] ?? r['LogoUrl'] ?? null) as string | null,
      primaryColor: (r['primaryColor'] ?? r['PrimaryColor']) as string | undefined,
      schemaName: (r['schemaName'] ?? r['SchemaName']) as string | undefined,
    };
  }
}
