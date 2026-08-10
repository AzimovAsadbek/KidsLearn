import { Controller, Get, Global, Injectable, Logger, Module, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import PDFDocument from "pdfkit";
import { ActivityType, CertificateStatus, MediaKind, type CertificateDto } from "@kidslearn/types";
import type { Prisma } from "@kidslearn/database";
import { PrismaService } from "../common/prisma/prisma.service";
import { AppException } from "../common/errors/app-exception";
import { CurrentUser, Roles, type RequestUser } from "../common/decorators";
import { ChildAccessService } from "../children/child-access.service";
import { MediaService } from "../media/media.module";
import { StorageService } from "../media/storage.service";

const certificateInclude = { child: true, media: true } satisfies Prisma.CertificateInclude;
type CertificateRow = Prisma.CertificateGetPayload<{ include: typeof certificateInclude }>;

/**
 * Certificates are rendered to a real PDF and stored as an object, not
 * generated on the fly per download. Rendering happens after the row exists, so
 * a failed render leaves a visible FAILED certificate rather than nothing.
 */
@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly storage: StorageService,
  ) {}

  toDto(row: CertificateRow): CertificateDto {
    return {
      id: row.id,
      childId: row.childId,
      childName: row.child.name,
      title: "Certificate of Achievement",
      programme: row.programme,
      serial: row.serial,
      xp: row.xp,
      stars: row.stars,
      issuedAt: row.issuedAt.toISOString(),
      pdfUrl: row.media ? this.storage.publicUrl(row.media.storageKey) : null,
      status: row.status,
    };
  }

  async listForChild(childId: string): Promise<CertificateDto[]> {
    const rows = await this.prisma.certificate.findMany({
      where: { childId },
      orderBy: { issuedAt: "desc" },
      include: certificateInclude,
    });
    return rows.map((row) => this.toDto(row));
  }

  async findOne(id: string): Promise<CertificateRow> {
    const row = await this.prisma.certificate.findUnique({ where: { id }, include: certificateInclude });
    if (!row) throw AppException.notFound("That certificate no longer exists.");
    return row;
  }

  /** Issues a certificate and renders its PDF. */
  async issue(childId: string, programme: string): Promise<CertificateDto> {
    const progress = await this.prisma.progress.findUniqueOrThrow({ where: { childId } });
    const serial = `KL-${new Date().getUTCFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;

    const certificate = await this.prisma.certificate.create({
      data: {
        childId,
        programme,
        serial,
        xp: progress.xp,
        stars: progress.stars,
        status: CertificateStatus.PENDING,
      },
      include: certificateInclude,
    });

    await this.prisma.activity.create({
      data: {
        childId,
        type: ActivityType.CERTIFICATE_ISSUED,
        title: "Earned a certificate",
        detail: programme,
        glyph: "📜",
        tone: "sun",
        refId: certificate.id,
      },
    });

    return this.render(certificate.id);
  }

  async render(certificateId: string): Promise<CertificateDto> {
    const certificate = await this.findOne(certificateId);

    try {
      const pdf = await this.buildPdf(certificate);
      const media = await this.media.store({
        buffer: pdf,
        originalName: `certificate-${certificate.serial}.pdf`,
        kind: MediaKind.CERTIFICATE,
      });

      const updated = await this.prisma.certificate.update({
        where: { id: certificateId },
        data: { status: CertificateStatus.READY, mediaId: media.id, error: null },
        include: certificateInclude,
      });
      return this.toDto(updated);
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`Certificate ${certificateId} failed to render: ${message}`);
      const failed = await this.prisma.certificate.update({
        where: { id: certificateId },
        data: { status: CertificateStatus.FAILED, error: message.slice(0, 300) },
        include: certificateInclude,
      });
      return this.toDto(failed);
    }
  }

  /** A4 landscape, drawn with primitives so no font or image assets are needed. */
  private buildPdf(certificate: CertificateRow): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const width = doc.page.width;
      const height = doc.page.height;
      const brand = "#6D3FF0";
      const ink = "#14152B";
      const muted = "#64688A";

      doc.rect(0, 0, width, height).fill("#FFFFFF");
      doc.lineWidth(6).strokeColor(brand).rect(26, 26, width - 52, height - 52).stroke();
      doc.lineWidth(1).strokeColor("#D8CCFF").rect(40, 40, width - 80, height - 80).stroke();

      doc.fillColor(brand).fontSize(13).font("Helvetica-Bold")
        .text("KIDSLEARN", 0, 74, { align: "center", characterSpacing: 5 });

      doc.fillColor(ink).fontSize(30).font("Helvetica-Bold")
        .text("CERTIFICATE OF ACHIEVEMENT", 0, 108, { align: "center", characterSpacing: 2.5 });

      doc.fillColor(muted).fontSize(11).font("Helvetica")
        .text("AWARDED TO", 0, 172, { align: "center", characterSpacing: 3 });

      doc.fillColor(brand).fontSize(52).font("Helvetica-Bold")
        .text(certificate.child.name.toUpperCase(), 0, 198, { align: "center", characterSpacing: 3 });

      doc.fillColor(muted).fontSize(11).font("Helvetica")
        .text("FOR COMPLETING", 0, 274, { align: "center", characterSpacing: 3 });

      doc.fillColor(ink).fontSize(21).font("Helvetica-Bold")
        .text(certificate.programme, 0, 298, { align: "center" });

      doc.fillColor(ink).fontSize(14).font("Helvetica-Bold")
        .text(`${certificate.stars} stars     ·     ${certificate.xp} XP`, 0, 348, { align: "center" });

      const issued = certificate.issuedAt.toISOString().slice(0, 10);
      doc.fillColor(muted).fontSize(9).font("Helvetica")
        .text(`Issued ${issued}`, 70, height - 96)
        .text(`Serial ${certificate.serial}`, 70, height - 82);

      doc.fillColor(brand).fontSize(13).font("Helvetica-Bold")
        .text("KidsLearn", width - 250, height - 100, { width: 180, align: "right" });
      doc.moveTo(width - 250, height - 80).lineTo(width - 70, height - 80).strokeColor("#D3D6E6").lineWidth(1).stroke();
      doc.fillColor(muted).fontSize(9).font("Helvetica")
        .text("Head of Learning", width - 250, height - 74, { width: 180, align: "right" });

      doc.end();
    });
  }
}

@ApiTags("Certificates")
@Controller()
export class CertificatesController {
  constructor(
    private readonly certificates: CertificatesService,
    private readonly access: ChildAccessService,
  ) {}

  @Get("children/:childId/certificates")
  @ApiOperation({ summary: "Certificates earned by one child" })
  @ApiParam({ name: "childId", format: "uuid" })
  async listForChild(@CurrentUser() user: RequestUser, @Param("childId") childId: string) {
    await this.access.assertAccess(user, childId);
    return this.certificates.listForChild(childId);
  }

  @Get("certificates/:id")
  @ApiOperation({ summary: "One certificate, with a link to its PDF" })
  @ApiParam({ name: "id", format: "uuid" })
  async findOne(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    const certificate = await this.certificates.findOne(id);
    await this.access.assertAccess(user, certificate.childId);
    return this.certificates.toDto(certificate);
  }

  @Roles("ADMIN")
  @Post("children/:childId/certificates")
  @ApiOperation({ summary: "Issue a certificate and render its PDF" })
  @ApiParam({ name: "childId", format: "uuid" })
  async issue(@Param("childId") childId: string) {
    return this.certificates.issue(childId, "Early Learning Program");
  }

  @Post("certificates/:id/render")
  @ApiOperation({ summary: "Re-render a certificate that failed" })
  @ApiParam({ name: "id", format: "uuid" })
  async rerender(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    const certificate = await this.certificates.findOne(id);
    await this.access.assertAccess(user, certificate.childId);
    return this.certificates.render(id);
  }
}

@Global()
@Module({
  controllers: [CertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
