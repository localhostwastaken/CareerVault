import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { StorageService } from '../../services/storage/storage.service.js';
import { DocumentService } from './document.service.js';
import { ApproveDocumentDto } from './dto/approve-document.dto.js';
import { ListDocumentsQuery } from './dto/list-documents.query.js';
import { RejectDocumentDto } from './dto/reject-document.dto.js';
import { RequestDocumentDto } from './dto/request-document.dto.js';
import { ResubmitRequestDto } from './dto/resubmit-request.dto.js';
import { RevokeDocumentDto } from './dto/revoke-document.dto.js';
import { SignDocumentDto } from './dto/sign-document.dto.js';
import { UpdateDraftDto } from './dto/update-draft.dto.js';

@ApiTags('documents')
@Controller('documents')
export class DocumentController {
  constructor(
    private readonly documents: DocumentService,
    private readonly storage: StorageService,
  ) {}

  @Post('request')
  request(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestDocumentDto,
  ) {
    return this.documents.request(user, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListDocumentsQuery,
  ) {
    return this.documents.list(user, query);
  }

  @Get(':id')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.getById(id, user);
  }

  @Put(':id')
  updateDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDraftDto,
  ) {
    return this.documents.updateDraft(id, user, dto);
  }

  @Post(':id/sign')
  @HttpCode(200)
  sign(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SignDocumentDto,
  ) {
    return this.documents.sign(id, user, dto);
  }

  @Post(':id/approve')
  @HttpCode(200)
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApproveDocumentDto,
  ) {
    return this.documents.approve(id, user, dto);
  }

  @Post(':id/reject')
  @HttpCode(200)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RejectDocumentDto,
  ) {
    return this.documents.reject(id, user, dto);
  }

  @Post(':id/return')
  @HttpCode(200)
  returnToHolder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RejectDocumentDto,
  ) {
    return this.documents.returnByManager(id, user, dto);
  }

  @Put(':id/resubmit')
  @HttpCode(200)
  resubmit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ResubmitRequestDto,
  ) {
    return this.documents.resubmitRequest(id, user, dto);
  }

  @Post(':id/revoke')
  @HttpCode(200)
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RevokeDocumentDto,
  ) {
    return this.documents.revoke(id, user, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.delete(id, user);
  }

  @Get(':id/download')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const doc = await this.documents.getById(id, user);
    if (!doc.renderedPdfUrl) throw new NotFoundException('PDF not available');
    const buffer = await this.storage.get(`documents/${id}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${id}.pdf"`);
    res.send(buffer);
  }
}
