import {
    UseInterceptors,
    NestInterceptor,
    ExecutionContext,
    CallHandler
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { plainToClass } from 'class-transformer';
// import { UserDto } from 'src/users/dtos/user.dto';

interface ClassConstructor{
    new (...args: any[]): {}
}

export function Serialize(dto: ClassConstructor) {
  return UseInterceptors(new SerializeInterceptor(dto));
}

export class SerializeInterceptor implements NestInterceptor{
    constructor(private dto: any){}

    intercept(context: ExecutionContext, handler: CallHandler): Observable<any>{
        //Run something before a request is handled
        console.log('Im running before the handler', context);

        return handler.handle().pipe(
            map((data: any) => {
                return plainToClass(this.dto, data,{
                    excludeExtraneousValues: true,
                })
            })
        )
    }
}